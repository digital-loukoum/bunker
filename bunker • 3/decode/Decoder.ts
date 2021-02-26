import Coder from '../Coder'
import Byte from '../Byte'

export type Dispatcher = () => any
export type DispatcherRecord = Record<string, Dispatcher>

const infinity = 4096
const nan = 2048

export default abstract class Decoder implements Coder<Dispatcher> {
	decodeString = TextDecoder.prototype.decode.bind(new TextDecoder)
	memory: object[] = []  // array of all objects encountered
	stringMemory: string[] = []  // array of all strings encountered

	abstract byte(): number  // read a single byte
	abstract bytes(length: number): Uint8Array  // read bytes
	abstract bytesUntil(stopAtByte: number): Uint8Array  // read bytes until a stop byte value
	abstract nextByteIs(byte: number): boolean  // check if next byte has a value; increment the cursor if true
	abstract error(message: string): Error  // display an error message

	decode(): any {
		return this.any()
	}

	/**
	 * --- Primitives
	 */
	unknown() {
		throw Error(`Call to Encoder::unknown`)
	}

	character() {
		return this.byte()
	}

	binary(): Uint8Array {
		if (this.nextByteIs(Byte.reference)) return this.recall() as Uint8Array
		const length = this.integer()
		return this.bytes(length)
	}

	boolean() {
		return this.byte() == 0 ? false : true
	}

	regularExpression() {
		new RegExp(this.string(), this.string())
	}

	date() {
		new Date(this.integer())
	}

	any() {
		this.schema()()
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

	number() {
		const exponent = this.integer()
		if (exponent == infinity) return Infinity
		else if (exponent == -infinity) return -Infinity
		else if (exponent == nan) return NaN
		return +`${this.integer()}e${exponent}`
	}

	string() {
		if (this.nextByteIs(Byte.stringReference)) return this.stringMemory[this.positiveInteger()]
		const decoded = this.decodeString(this.bytesUntil(0))
		if (decoded.length > 1) this.stringMemory.push(decoded)
		return decoded
	}

	/**
	 * --- Constructibles
	 */
	nullable(dispatch: Dispatcher = this.unknown) {
		return () => {
			switch (this.byte()) {
				case Byte.null: return null
				case Byte.undefined: return undefined
				default: return dispatch.call(this)
			}
		}
	}

	tuple(dispatchers: Dispatcher[]) {
		return () => {
			const tuple: Array<any> = []
			for (let i = 0; i < dispatchers.length; i++) {
				tuple[i] = dispatchers[i].call(this)
			}
			return tuple
		}
	}

	/**
	 * --- Objects
	 */
	private isReference() {
		return this.nextByteIs(Byte.reference)
	}
	private properties(object: any, dispatch: DispatcherRecord) {
		for (const key in dispatch) object[key] = dispatch[key].call(this)
		return object
	}
	private recall() {
		return this.memory[this.positiveInteger()] as unknown
	}

	object(properties: DispatcherRecord = {}) {
		return function(this: Decoder) {
			if (this.isReference()) return this.recall() as Record<string, any>
			const object: Record<string, any> = {}
			this.memory.push(object)
			return this.properties(object, properties)
		}
	}

	array(dispatch: Dispatcher = this.unknown, properties: DispatcherRecord = {}) {
		return function(this: Decoder) {
			if (this.isReference()) return this.recall() as any[]
			const length = this.integer()
			const array = Array<any>(length)
			this.memory.push(array)
			for (let i = 0; i < length; i++) array[i] = dispatch.call(this)
			return this.properties(array, properties)
		}
	}

	set(dispatch: Dispatcher = this.unknown, properties: DispatcherRecord = {}) {
		return function(this: Decoder) {
			if (this.isReference()) return this.recall() as Set<any>
			const length = this.integer()
			const set = new Set<any>()
			this.memory.push(set)
			for (let i = 0; i < length; i++) set.add(dispatch.call(this))
			return this.properties(set, properties)
		}
	}

	record(dispatch: Dispatcher = this.unknown) {
		return function(this: Decoder) {
			if (this.isReference()) return this.recall() as Record<string, any>
			const length = this.integer()
			const record: Record<string, any> = {}
			this.memory.push(record)
			for (let i = 0; i < length; i++) record[this.string()] = dispatch.call(this)
			return record
		}
	}

	map(dispatch: Dispatcher = this.unknown, properties: DispatcherRecord = {}) {
		return function(this: Decoder) {
			if (this.isReference()) return this.recall() as Map<string, any>
			const length = this.integer()
			const map = new Map<string, any>()
			this.memory.push(map)
			for (let i = 0; i < length; i++) map.set(this.string(), dispatch.call(this))
			return this.properties(map, properties)
		}
	}

	/**
	 * --- Schema
	 * Read the schema's bytes and return a dispatcher
	 */
	schema(): Dispatcher {
		switch (this.byte()) {
			case Byte.unknown: return this.unknown
			case Byte.any: return this.any
			case Byte.boolean: return this.boolean
			case Byte.character: return this.character
			case Byte.binary: return this.binary
			case Byte.integer: return this.integer
			case Byte.positiveInteger: return this.positiveInteger
			case Byte.bigInteger: return this.bigInteger
			case Byte.number: return this.number
			case Byte.string: return this.string
			case Byte.regularExpression: return this.regularExpression
			case Byte.date: return this.date
			// case Byte.reference: return this.reference

			case Byte.nullable: return this.nullable(this.schema())  // TODO: can be 'unknown'
			case Byte.object: return this.object(this.schemaProperties())
			case Byte.array: return this.array(this.schema(), this.schemaProperties())
			case Byte.set: return this.set(this.schema(), this.schemaProperties())
			case Byte.map: return this.map(this.schema(), this.schemaProperties())
			case Byte.record: return this.record(this.schema())

			default: throw this.error(`unknown byte`)
		}
	}

	private schemaProperties(): DispatcherRecord {
		const dispatcher: DispatcherRecord = {}
		while (!this.nextByteIs(Byte.stop)) dispatcher[this.string()] = this.schema()
		return dispatcher
	}
}
