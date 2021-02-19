import Type from '../constants/Type'
import NullableValue from '../constants/NullableValue'
import Byte from '../constants/Byte'
import joinSchemas from '../schema/joinSchemas'
import Schema, {
	BunkerObject,
	isPrimitive,
	isObject,
	isArray, BunkerArray,
	isMap, BunkerMap,
	isRecord,
	reference, isReference,
	isTuple,
	isSet, BunkerSet,
	nullable, isNullable,
} from '../schema/Schema'

export type Dispatcher = (value: any) => void
export type ObjectDispatcher = Record<string, Dispatcher>

/**
 * The Encoder abstract class implements the encoding logic without the details.
 */
export default abstract class Encoder {
	schemaMemory: object[] = []
	compiledMemory: Dispatcher[] = []  // array of all compiled schema objects
	memory: object[] = []  // array of all objects encountered
	stringMemory: string[] = []  // array of all strings encountered
	stringEncoder = new TextEncoder
	compiledMemoryPrefixLength = 0  // the initial length of compiledMemory
	
	abstract data: any
	abstract byte(value: number): void  // write a single byte
	abstract bytes(value: Uint8Array): void  // write an array of bytes
	
	// lock the current data as prefix; resets will keep it alive
	lockAsPrefix() {
		this.compiledMemoryPrefixLength = this.compiledMemory.length
	}  

	// reset data (but keep prefix bytes if any)
	reset() {
		this.memory.length = 0
		this.stringMemory.length = 0
		this.compiledMemory.length = this.compiledMemoryPrefixLength
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
		this.compileSchema(this.guessSchema(value))(value)
	}
	
	regularExpression(value: RegExp) {
		this.string(value.source)
		this.string(value.flags)
	}
	
	date(value: Date) {
		this.integer(value.getTime())
	}

	string(value: string) {
		// we check if the string is in memory
		if (value.length > 1) {
			const index = this.stringMemory.indexOf(value)
			if (~index) {
				this.byte(Type.reference)
				this.positiveInteger(index)
				return
			}
			this.stringMemory.push(value)
		}
		this.bytes(this.stringEncoder.encode(value))
		this.byte(0)
	}

	reference(value: number) {
		console.log("Reference!", value, this.memory)
		this.byte(Type.reference)
		this.positiveInteger(value)
	}

	inMemory(value: object): boolean {
		console.log("Already encountered?")
		const index = this.memory.indexOf(value)
		if (~index) {
			console.log("Yes!")
			this.byte(Type.reference)
			this.positiveInteger(index)
			return true
		}
		console.log("No.")
		this.memory.push(value)
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
		if (this.inMemory(value)) return
		this.properties(properties, value)
	}

	array(dispatch: Dispatcher, properties: ObjectDispatcher, value: any[]) {
		if (this.inMemory(value)) return
		this.integer(value.length)
		for (const element of value)
			dispatch(element)
		this.properties(properties, value)
	}

	set(dispatch: Dispatcher, properties: ObjectDispatcher, value: Set<any>) {
		if (this.inMemory(value)) return
		this.integer(value.size)
		for (const element of value)
			dispatch(element)
		this.properties(properties, value)
	}

	record(dispatch: Dispatcher, value: Record<string, any>) {
		if (this.inMemory(value)) return
		this.positiveInteger(Object.keys(value).length)
		for (const key in value) {
			this.string(key)
			dispatch(value[key])
		}
	}

	map(dispatch: Dispatcher, properties: ObjectDispatcher, map: Map<string, any>) {
		if (this.inMemory(map)) return
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
	compileSchema(schema: Schema): Dispatcher {
		if (isPrimitive(schema)) {
			this.byte(schema)
			// @ts-ignore [TODO]
			return this[Type[schema]].bind(this)
		}
		if (isNullable(schema)) {
			this.byte(Type.nullable)
			return this.nullable.bind(this, this.compileSchema(schema.type))
		}
		if (isTuple(schema)) {
			this.byte(Type.tuple)
			this.positiveInteger(schema.length)
			return this.tuple.bind(this, schema.map(type => this.compileSchema(type)))
		}

		// we have an object: we check if it exists in compiled memory
		const index = this.schemaMemory.indexOf(schema)
		if (~index) {
			this.byte(Type.reference)
			return this.reference.bind(this, index)
		}
		if (isObject(schema)) {
			this.byte(Type.object)
			return this.object.bind(this, this.compileSchemaProperties(schema))
		}
		if (isArray(schema)) {
			this.byte(Type.array)
			return this.array.bind(this, this.compileSchema(schema.type), this.compileSchemaProperties(schema.properties))
		}
		if (isSet(schema)) {
			this.byte(Type.set)
			return this.set.bind(this, this.compileSchema(schema.type), this.compileSchemaProperties(schema.properties))
		}
		if (isMap(schema)) {
			this.byte(Type.map)
			return this.map.bind(this, this.compileSchema(schema.type), this.compileSchemaProperties(schema.properties))
		}
		if (isRecord(schema)) {
			this.byte(Type.record)
			return this.record.bind(this, this.compileSchema(schema.type))
		}

		console.error('Unkown schema type:', schema)
		throw Error(`Unknown schema type`)
	}

	compileSchemaProperties(schema: BunkerObject): ObjectDispatcher {
		const dispatcher: ObjectDispatcher = {}
		for (const key in schema) {
			this.string(key)
			dispatcher[key] = this.compileSchema(schema[key])
		}
		this.byte(Byte.stop)
		return dispatcher
	}


	/**
	 * Compile a value.
	 */
	compileValue(value: any) {
		switch (typeof value) {
			case 'undefined': return this.nullable
			case 'number': return Number.isInteger(value) ? this.integer : this.number
			case 'bigint': return this.bigInteger
			case 'string': return this.string
			case 'boolean': return this.boolean
			case 'function': throw `Cannot encode a function into bunker data`
			default:
				if (value == null) return this.nullable
				if (value instanceof Date) return this.date
				if (value instanceof RegExp) return this.regularExpression
	
				// if we have a schema reference, return it
				// const cached = cache.get(value)
				// if (cached) return cached
				// let schema: Schema
	
				// new object
				if (value instanceof Array) return this.compileArray(value)
				if (value instanceof Set) return this.compileSet(value)
				if (value instanceof Map) return this.compileMap(value)
				else return this.compileObject(value)
		}
	}

	compileArray(value: any[]) {
		let dispatch: Dispatcher = this.unknown
		let properties: ObjectDispatcher = {}
		let index = 0, indexes = 0
		for (let i = 0; i < value.length; i++) {
			if (i in value) indexes++  // empty values are not indexed
			dispatch = joinDispatchers(dispatch, this.compileValue(value[i]))
		}
		for (const key in value) {
			if (index++ < indexes) continue  // the first keys are always the array values
			properties[key] = guessSchema(value[key])
		}
		return new BunkerArray(dispatch, properties)
	
	}

	bind(fn: Function, ...args: any[]) {
		const bounded = fn.bind(null, ...args)
		bounded.__boundedArgs__ = args
		return bounded
	}
}
