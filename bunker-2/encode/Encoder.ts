import Type from '../constants/Type'
import NullableValue from '../constants/NullableValue'
import Byte from '../constants/Byte'
import Schema, {
	BunkerObject,
	isPrimitive,
	isObject,
	isArray,
	isMap,
	isRecord,
	isReference,
	isTuple,
	isSet,
	isNullable,
} from '../schema/Schema'
import guessSchema from '../schema/guessSchema'

export type Dispatcher = (value: any) => void
export type ObjectDispatcher = Record<string, Dispatcher>

/**
 * The Encoder abstract class implements the encoding logic without the details.
 */
export default abstract class Encoder {
	references: Object[] = []
	stringReferences: string[] = []
	stringEncoder = new TextEncoder
	
	abstract data: any
	abstract byte(value: number): void  // write a single byte
	abstract bytes(value: Uint8Array): void  // write an array of bytes
	abstract lockAsPrefix(): void  // lock the current data as prefix; resets will keep it alive

	// reset data (but keep prefix bytes if any)
	reset() {
		this.references.length = 0
		this.stringReferences.length = 0
	}  

	character(value: number) {
		this.byte(value)
	}

	unknown() {
		throw Error(`Call to Encoder::unknown`)
	}

	positiveInteger(value: number) {
		do {
			const nextValue = Math.floor(value / 128)
			this.byte(value % 128 + (nextValue ? 128 : 0))
			value = nextValue
		} while (value)
	}

	integer(value: number) {
		let sign = 0
		if (value < 0 ||( value == 0 && Object.is(value, -0))) {
			sign = 128
			value = -value
		}
		const nextValue = Math.floor(value / 64)
		this.byte(sign + (nextValue ? 64: 0) + (value % 64))
		if (nextValue) this.positiveInteger(nextValue)
	}

	/**
	 * Encoding numbers is hard in Javascript as arithmetic operations
	 * do not always return the expected result.
	 * Example: '12.3456 * 10' will return '123.45599999999999'
	 */
	number(value: number) {
		if (value == Infinity) return this.integer(2 ** 13)
		else if (value == -Infinity) return this.integer(-(2 ** 13))
		let [integer, decimals] = value.toString().split('.')
		let mantissa = 0
		let exponent = 0
		if (decimals) {
			mantissa = +(integer + decimals)
			exponent = -(decimals.length)
		}
		else {
			while (integer[integer.length - exponent - 1] == '0') exponent++
			mantissa = +(integer.slice(0, -exponent))
		}

		this.integer(exponent)
		this.integer(mantissa)
	}

	bigInteger(value: bigint) {
		let sign = 0
		if (value < 0n) {
			sign = 128
			value = -value
		}
		let nextValue = value / 64n
		this.byte(sign + (nextValue ? 64 : 0) + Number(value % 64n))
		if (nextValue) {
			value = nextValue
			do {
				nextValue = value / 128n
				this.byte((nextValue ? 128 : 0) + Number(value % 128n))
				value = nextValue
			} while (value)
		}
	}

	boolean(value: boolean) {
		this.byte(value ? 1 : 0)
	}

	any(value: any) {
		this.compile(guessSchema(value))(value)
	}
	
	regularExpression(value: RegExp) {
		this.string(value.source)
		this.string(value.flags)
	}
	
	date(value: Date) {
		this.integer(value.getTime())
	}

	string(value: string) {
		if (this.stringReference(value)) return
		this.bytes(this.stringEncoder.encode(value))
		this.byte(0)
	}

	stringReference(value: string) {
		const index = this.stringReferences.indexOf(value)
		if (~index) {
			this.byte(Type.reference)
			this.positiveInteger(index)
			return true
		}
		this.references.push(value)
		return false
	}

	reference(value: Object): boolean {
		const index = this.references.indexOf(value)
		if (~index) {
			this.byte(Type.reference)
			this.positiveInteger(index)
			return true
		}
		this.references.push(value)
		return false
	}

	tuple(dispatchers: Dispatcher[], value: [...any]) {
		for (let i = 0; i < dispatchers.length; i++)
			dispatchers[i](value[i])
	}

	properties(properties: ObjectDispatcher, value: Record<string, any>) {
		if (properties) for (const key in properties) properties[key](value[key])
	}

	nullable(dispatch: Dispatcher, value: any) {
		if (value === null)
			this.byte(NullableValue.null)
		else if (value === undefined)
			this.byte(NullableValue.undefined)
		else {
			this.byte(NullableValue.defined)
			dispatch(value)
		}
	}

	object(properties: ObjectDispatcher, value: Record<string, any>) {
		if (this.reference(value)) return
		this.properties(properties, value)
	}

	array(dispatch: Dispatcher, properties: ObjectDispatcher, value: any[]) {
		if (this.reference(value)) return
		this.integer(value.length)
		for (const element of value)
			dispatch(element)
		this.properties(properties, value)
	}

	set(dispatch: Dispatcher, properties: ObjectDispatcher, value: Set<any>) {
		if (this.reference(value)) return
		this.integer(value.size)
		for (const element of value)
			dispatch(element)
		this.properties(properties, value)
	}

	record(dispatch: Dispatcher, value: Record<string, any>) {
		if (this.reference(value)) return
		this.positiveInteger(Object.keys(value).length)
		for (const key in value) {
			this.string(key)
			dispatch(value[key])
		}
	}

	map(dispatch: Dispatcher, properties: ObjectDispatcher, map: Map<string, any>) {
		if (this.reference(map)) return
		this.positiveInteger(map.size)
		for (const [key, value] of map.entries()) {
			this.string(key)
			dispatch(value)
		}
		this.properties(properties, map)
	}

	/**
	 * Compile a schema.
	 * Write the schema's encoded bytes and return a dispatcher.
	 * Execute the dispatcher with a value corresponding to the given schema
	 * to encode it.
	 */
	compile(schema: Schema): Dispatcher {
		if (isPrimitive(schema)) {
			this.byte(schema)
			// @ts-ignore [TODO]
			return this[Type[schema]].bind(this)
		}
		else if (isObject(schema)) {
			this.byte(Type.object)
			return this.object.bind(this, this.compileProperties(schema))
		}
		else if (isArray(schema)) {
			this.byte(Type.array)
			return this.array.bind(this, this.compile(schema.type), this.compileProperties(schema.properties))
		}
		else if (isNullable(schema)) {
			this.byte(Type.nullable)
			return this.nullable.bind(this, this.compile(schema.type))
		}
		else if (isReference(schema)) {
			this.byte(Type.reference)
			this.positiveInteger(schema.reference)
			return this.reference.bind(this)
		}
		else if (isSet(schema)) {
			this.byte(Type.set)
			return this.set.bind(this, this.compile(schema.type), this.compileProperties(schema.properties))
		}
		else if (isMap(schema)) {
			this.byte(Type.map)
			return this.map.bind(this, this.compile(schema.type), this.compileProperties(schema.properties))
		}
		else if (isRecord(schema)) {
			this.byte(Type.record)
			return this.record.bind(this, this.compile(schema.type))
		}
		else if (isTuple(schema)) {
			this.byte(Type.tuple)
			this.positiveInteger(schema.length)
			return this.tuple.bind(this, schema.map(type => this.compile(type)))
		}
		else {
			console.error('Unkown schema type:', schema)
			throw Error(`Unknown schema type`)
		}
	}

	compileProperties(schema: BunkerObject): ObjectDispatcher {
		const dispatcher: ObjectDispatcher = {}
		for (const key in schema) {
			this.string(key)
			dispatcher[key] = this.compile(schema[key])
		}
		this.byte(Byte.stop)
		return dispatcher
	}
}
