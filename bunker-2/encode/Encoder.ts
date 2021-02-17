import Type from '../constants/Type'
import NullableValue from '../constants/NullableValue'
import Byte from '../constants/Byte'
import Schema, {
	nullable,
	reference,
	BunkerObject,
	isPrimitive, isObject, isArray,
	array, BunkerArray,
	set, BunkerSet,
	map, BunkerMap,
} from '../schema/Schema'

export type Dispatcher<Type = any> = (value: any) => void
export type PropertyDispatcher = Record<string, Dispatcher> | null

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
	abstract prefix(bytes: Uint8Array): void  // prefix the data with the given bytes array
	
	// reset data (but keep prefix bytes if any)
	reset() {
		this.references.length = 0
		this.stringReferences.length = 0
	}  

	character(value: number) {
		this.byte(value)
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

	number(value: number) {
		if (value == 0) {
			this.integer(0)
			this.integer(value)
		}
		else {
			let base = value, exponent = 0
			while (Number.isInteger(value = base / 10)) {
				base = value
				exponent++
			}
			this.integer(exponent)
			this.integer(base)
		}
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
		this.schema(value)(value)
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

	properties(properties: PropertyDispatcher, value: Record<string, any>) {
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

	object(properties: PropertyDispatcher, value: Record<string, any>) {
		if (this.reference(value)) return
		this.properties(properties, value)
	}

	array(dispatchElement: Dispatcher, properties: PropertyDispatcher, value: any[]) {
		if (this.reference(value)) return
		this.integer(value.length)
		for (const element of value)
			dispatchElement(element)
		this.properties(properties, value)
	}

	set(dispatchElement: Dispatcher, properties: PropertyDispatcher, value: Set<any>) {
		if (this.reference(value)) return
		this.integer(value.size)
		for (const element of value)
			dispatchElement(element)
		this.properties(properties, value)
	}

	record(dispatchElement: Dispatcher, properties: PropertyDispatcher, value: Record<string, any>) {
		if (this.reference(value)) return
		this.positiveInteger(Object.keys(value).length)
		for (const key in value) {
			this.string(key)  // we  the key
			dispatchElement(value[key])  // we  the value
		}
		this.properties(properties, value)
	}

	map(dispatchElement: Dispatcher, properties: PropertyDispatcher, map: Map<string, any>) {
		if (this.reference(map)) return
		this.positiveInteger(map.size)
		for (const [key, value] of map.entries()) {
			this.string(key)
			dispatchElement(value)
		}
		this.properties(properties, map)
	}

	// --- compile schema
	compile(schema: Schema): Dispatcher {
		if (isPrimitive(schema)) {
			this.byte(schema)
			// @ts-ignore [TODO]
			return this[Type[schema]]
		}
		else if (isObject(schema)) {
			this.byte(Type.object)
			const dispatcher: Record<string, Dispatcher> = {}
			for (const key in schema) {
				this.string(key)
				dispatcher[key] = this.compile(schema[key])
			}
			return this.object.bind(this, dispatcher)
		}
		else if (isArray(schema)) {
			this.byte(Type.object)
			const dispatcher = this.compile(schema.type)
			const propertiesDispatcher = this.compileObject(schema.properties)
		}
		// else if (isArray(schema)) {
		// 	this.byte(Type.object)
		// 	const dispatcher: Record<string, Dispatcher> = {}
		// 	for (const key in schema) {
		// 		this.string(key)
		// 		dispatcher[key] = this.compile(schema[key])
		// 	}
		// 	return this.object.bind(this, dispatcher)
		// }
	}


}
