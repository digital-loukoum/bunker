import Type from '../constants/Type'
import Byte from '../constants/Byte'
import NullableValue from '../constants/NullableValue'
import { unknown } from '../../src/Schema'

export type Dispatcher = () => any
export type ObjectDispatcher = Record<string, Dispatcher>

function dispatchProperties(object: any, dispatch: ObjectDispatcher) {
	for (const key in dispatch) object[key] = dispatch[key]()
	return object
}

export default abstract class Decoder {
	references: object[] = []
	schemaReferences: object[] = []
	stringReferences: string[] = []
	stringDecoder = new TextDecoder

	abstract byte(): number  // read a single byte
	abstract bytes(stopAtByte: number): Uint8Array  // read bytes until a stop byte value
	abstract nextByteIs(byte: number): boolean  // check if next byte has a value; increment the cursor if true

	null() {
		return this.byte() ? undefined : null
	}

	boolean() {
		return !!this.byte()
	}
	character() {
		return this.byte()
	}

	regularExpression() {
		return new RegExp(this.string(), this.string())
	}

	string() {
		if (this.nextByteIs(Byte.reference)) return this.stringReference()
		const decoded = this.stringDecoder.decode(this.bytes(0))
		this.stringReferences.push(decoded)
		return decoded
	}

	stringReference() {
		return 
	}

	number() {
		const exponent = this.integer()
		if (exponent == 2 ** 13) return Infinity
		else if (exponent == -(2 ** 13)) return -Infinity
		return +`${this.integer()}e${exponent}`
	}

	integer() {
		let sign = 1
		let integer = this.byte()
		if (integer & 128) {
			sign = -1
			integer %= 128
		}
		if (integer & 64) {
			let base = 64
			let byte: number
			integer %= 64
			do {
				byte = this.byte()
				integer += base * (byte % 128)
				base *= 128
			} while (byte & 128)
		}
		return sign * integer
	}

	date() {
		return new Date(this.integer())
	}

	positiveInteger() {
		let base = 1
		let byte: number
		let integer = 0
		do {
			byte = this.byte()
			integer += base * (byte % 128)
			base *= 128
		} while (byte & 128)
		return integer
	}

	bigInteger() {
		let sign = 1n
		let bigint = BigInt(this.byte())
		if (bigint & 128n) {
			sign = -1n
			bigint %= 128n
		}
		if (bigint & 64n) {
			let base = 64n
			let byte: number
			bigint %= 64n
			do {
				byte = this.byte()
				bigint += base * BigInt(byte % 128)
				base *= 128n
			} while (byte & 128)
		}
		return sign * bigint
	}

	any() {
		return this.compile()()
	}

	unknown() {  // should never be called
		throw Error(`Call to Decoder::unknown`)
	}

	nullable(dispatch: Dispatcher) {
		switch (this.byte()) {
			case NullableValue.null: return null
			case NullableValue.undefined: return undefined
			default: return dispatch()
		}
	}

	tuple(dispatchers: Dispatcher[]) {
		const tuple: Array<any> = []
		this.references.push(tuple)
		for (let i = 0; i < dispatchers.length; i++) {
			tuple[i] = dispatchers[i]()
		}
		return tuple
	}

	reference() {
	}

	// recall a previously encountered object
	recall() {
		return this.references[this.positiveInteger()] as unknown
	}

	object(properties: ObjectDispatcher): Record<string, any> {
		if (this.nextByteIs(Byte.reference)) return this.recall() as Record<string, any>
		const object: Record<string, any> = {}
		this.references.push(object)
		return dispatchProperties(object, properties)
	}

	record(dispatch: Dispatcher): Record<string, any> {
		if (this.nextByteIs(Byte.reference)) return this.recall() as Record<string, any>
		const length = this.integer()
		const record: Record<string, any> = {}
		this.references.push(record)
		for (let i = 0; i < length; i++) record[this.string()] = dispatch()
		return record
	}

	array(dispatch: Dispatcher, properties: ObjectDispatcher): any[] {
		if (this.nextByteIs(Byte.reference)) return this.recall() as any[]
		const length = this.integer()
		const array = Array<any>(length)
		this.references.push(array)
		for (let i = 0; i < length; i++) array[i] = dispatch()
		return dispatchProperties(array, properties)
	}
	
	set(dispatch: Dispatcher, properties: ObjectDispatcher): Set<any> {
		if (this.nextByteIs(Byte.reference)) return this.recall() as Set<any>
		const length = this.integer()
		const set = new Set<any>()
		this.references.push(set)
		for (let i = 0; i < length; i++) set.add(dispatch())
		return dispatchProperties(set, properties)
	}
	
	map(dispatch: Dispatcher, properties: ObjectDispatcher): Map<string, any> {
		if (this.nextByteIs(Byte.reference)) return this.recall() as Map<string, any>
		const length = this.integer()
		const map= new Map<string, any>()
		this.references.push(map)
		for (let i = 0; i < length; i++) map.set(this.string(), dispatch())
		return dispatchProperties(map, properties)
	}

	/**
	 * Compile a schema from bunker encoded data.
	 * Read the schema's encoded bytes and return a dispatcher.
	 * Execute the dispatcher to retrieve the encoded data.
	 */
	compile(): Dispatcher {
		const byte = this.byte()
		switch (byte) {
			case Type.unknown: return this.unknown
			case Type.any: return this.any.bind(this)
			case Type.boolean: return this.boolean.bind(this)
			case Type.character: return this.character.bind(this)
			case Type.integer: return this.integer.bind(this)
			case Type.positiveInteger: return this.positiveInteger.bind(this)
			case Type.bigInteger: return this.bigInteger.bind(this)
			case Type.number: return this.number.bind(this)
			case Type.string: return this.string.bind(this)
			case Type.regularExpression: return this.regularExpression.bind(this)
			case Type.date: return this.date.bind(this)
			case Type.reference: return this.reference.bind(this)

			case Type.nullable: return this.nullable.bind(this, this.compile())  // TODO: can be 'unknown'
			case Type.object: return this.object.bind(this, this.compileProperties())
			case Type.array: return this.array.bind(this, this.compile(), this.compileProperties())
			case Type.set: return this.set.bind(this, this.compile(), this.compileProperties())
			case Type.map: return this.map.bind(this, this.compile(), this.compileProperties())
			case Type.record: return this.record.bind(this, this.compile())

			case Type.tuple: {
				const length = this.positiveInteger()
				const dispatch = new Array<Dispatcher>(length)
				for (let i = 0; i < length; i++) dispatch[i] = this.compile()
				return this.tuple.bind(this, dispatch)
			}

			default:
				throw Error(`[Decoder] Bad schema byte: ${byte}`)
		}
	}

	compileProperties(): ObjectDispatcher {
		const dispatcher: ObjectDispatcher = {}
		while (!this.nextByteIs(Byte.stop)) dispatcher[this.string()] = this.compile()
		return dispatcher
	}
}