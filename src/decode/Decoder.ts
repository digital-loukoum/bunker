import Coder, { Memory } from "../Coder"
import Byte from "../Byte"
import DataBuffer from "../DataBuffer"

export type Dispatcher = () => any
export type DispatcherRecord = Record<string, Dispatcher>

export default abstract class Decoder implements Coder<Dispatcher> {
	memory = new Memory<Dispatcher>()

	constructor(public buffer = new DataBuffer(), public cursor = 0) {}

	reset() {
		this.memory.objects.length = 0
		this.memory.strings.length = 0
		this.cursor = 0
	}

	decode(): any {
		this.reset()
		return this.any()
	}

	error(message: string) {
		return new Error(
			`${message} at position: ${this.cursor - 1}. Byte value: '${
				this.buffer[this.cursor - 1]
			}'.`
		)
	}

	/**
	 * --- Primitives
	 */
	byte(): number {
		return this.buffer[this.cursor++]
	}

	bytes(length: number) {
		const start = this.cursor
		this.cursor += length
		return this.buffer.slice(start, this.cursor)
	}

	nextByteIs(byte: number): boolean {
		if (this.buffer[this.cursor] == byte) {
			this.cursor++
			return true
		}
		return false
	}

	bytesUntil(stopAtByte: number) {
		const start = this.cursor
		while (this.byte() != stopAtByte);
		return this.buffer.slice(start, this.cursor - 1)
	}

	unknown() {
		throw Error(`Call to Decoder::unknown`)
	}

	character() {
		return this.byte()
	}

	binary(): Uint8Array {
		if (this.nextByteIs(Byte.reference)) return this.reference() as Uint8Array
		const length = this.integer()
		return this.bytes(length)
	}

	boolean() {
		return this.byte() == 0 ? false : true
	}

	regularExpression() {
		return new RegExp(this.string(), this.string())
	}

	date() {
		return new Date(this.integer())
	}

	any() {
		return this.schema().call(this)
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

	integer32() {
		const value = this.buffer.view.getInt32(this.cursor)
		this.cursor += 4
		return value
	}

	integer64() {
		const value = this.buffer.view.getBigInt64(this.cursor)
		this.cursor += 8
		return value
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
		let byte = this.byte()
		if (byte == 206) return Infinity
		else if (byte == 222) return -Infinity
		else if (byte == 238) return NaN

		let offset = 0
		let digit = byte >> 4
		let stringified = ""
		while (digit != 15) {
			stringified += this.numberDigitCharacter(digit)
			if (++offset % 2) {
				byte = this.byte()
				digit = byte >> 4
			} else digit = byte % 16
		}

		return +stringified
	}

	private numberDigitCharacter(digit: number) {
		switch (digit) {
			case 0:
				return "0"
			case 1:
				return "1"
			case 2:
				return "2"
			case 3:
				return "3"
			case 4:
				return "4"
			case 5:
				return "5"
			case 6:
				return "6"
			case 7:
				return "7"
			case 8:
				return "8"
			case 9:
				return "9"
			case 10:
				return "."
			case 11:
				return "+"
			case 12:
				return "-"
			case 13:
				return "e"
			case 14:
				return "i" // should not happen ; infinity is a special case
			default:
				throw `Unexpected digit in number: '${digit}'`
		}
	}

	number32() {
		const value = this.buffer.view.getFloat32(this.cursor)
		this.cursor += 4
		return value
	}

	number64() {
		const value = this.buffer.view.getFloat64(this.cursor)
		this.cursor += 8
		return value
	}

	string(): string {
		if (this.nextByteIs(Byte.stringReference)) {
			const decoded = this.memory.strings[this.positiveInteger()]
			return decoded
		}
		const characters: number[] = []
		let byte1, byte2, byte3, byte4

		while ((byte1 = this.byte())) {
			if ((byte1 & 0x80) === 0) {
				characters.push(byte1)
			} else if ((byte1 & 0xe0) === 0xc0) {
				byte2 = this.byte() & 0x3f
				characters.push(((byte1 & 0x1f) << 6) | byte2)
			} else if ((byte1 & 0xf0) === 0xe0) {
				byte2 = this.byte() & 0x3f
				byte3 = this.byte() & 0x3f
				characters.push(((byte1 & 0x1f) << 12) | (byte2 << 6) | byte3)
			} else if ((byte1 & 0xf8) === 0xf0) {
				byte2 = this.byte() & 0x3f
				byte3 = this.byte() & 0x3f
				byte4 = this.byte() & 0x3f
				let unit = ((byte1 & 0x07) << 0x12) | (byte2 << 0x0c) | (byte3 << 0x06) | byte4
				if (unit > 0xffff) {
					unit -= 0x10000
					characters.push(((unit >>> 10) & 0x3ff) | 0xd800)
					unit = 0xdc00 | (unit & 0x3ff)
				}
				characters.push(unit)
			} else {
				characters.push(byte1)
			}
		}

		const decoded = String.fromCharCode.apply(null, characters)
		if (decoded.length > 1) this.memory.strings.push(decoded)
		return decoded
	}

	/**
	 * --- Constructibles
	 */
	nullable(dispatch: Dispatcher = this.unknown) {
		return function (this: Decoder) {
			switch (this.byte()) {
				case Byte.null:
					return null
				case Byte.undefined:
					return undefined
				default:
					return dispatch.call(this)
			}
		}
	}

	tuple(...dispatchers: Dispatcher[]) {
		return function (this: Decoder) {
			const tuple: Array<any> = []
			for (let i = 0; i < dispatchers.length; i++) {
				tuple[i] = dispatchers[i].call(this)
			}
			return tuple
		}
	}

	recall(index: number) {
		return function (this: Decoder) {
			return this.memory.schema.dispatchers[index].call(this)
		}
	}

	/**
	 * --- Objects
	 */
	private isReference() {
		return this.nextByteIs(Byte.reference)
	}
	private properties(object: any, dispatch: DispatcherRecord) {
		for (const key in dispatch) {
			object[key] = dispatch[key].call(this)
		}
		return object
	}
	private reference() {
		return this.memory.objects[this.positiveInteger()] as unknown
	}

	object(properties: DispatcherRecord = {}) {
		return function (this: Decoder) {
			if (this.byte() == Byte.reference) return this.reference() as Record<string, any>
			const object: Record<string, any> = {}
			this.memory.objects.push(object)
			return this.properties(object, properties)
		}
	}

	array(dispatch: Dispatcher = this.unknown, properties: DispatcherRecord = {}) {
		return function (this: Decoder) {
			if (this.isReference()) return this.reference() as any[]
			const length = this.integer()
			const array = Array<any>(length)
			this.memory.objects.push(array)
			for (let i = 0; i < length; i++) array[i] = dispatch.call(this)
			return this.properties(array, properties)
		}
	}

	set(dispatch: Dispatcher = this.unknown, properties: DispatcherRecord = {}) {
		return function (this: Decoder) {
			if (this.isReference()) return this.reference() as Set<any>
			const length = this.integer()
			const set = new Set<any>()
			this.memory.objects.push(set)
			for (let i = 0; i < length; i++) set.add(dispatch.call(this))
			return this.properties(set, properties)
		}
	}

	record(dispatch: Dispatcher = this.unknown) {
		return function (this: Decoder) {
			if (this.isReference()) return this.reference() as Record<string, any>
			const length = this.integer()
			const record: Record<string, any> = {}
			this.memory.objects.push(record)
			for (let i = 0; i < length; i++) record[this.string()] = dispatch.call(this)
			return record
		}
	}

	map(dispatch: Dispatcher = this.unknown, properties: DispatcherRecord = {}) {
		return function (this: Decoder) {
			if (this.isReference()) return this.reference() as Map<string, any>
			const length = this.integer()
			const map = new Map<string, any>()
			this.memory.objects.push(map)
			for (let i = 0; i < length; i++) map.set(this.string(), dispatch.call(this))
			return this.properties(map, properties)
		}
	}

	/**
	 * Read the schema's bytes and return a dispatcher
	 */
	schema(): Dispatcher {
		const byte = this.byte()
		switch (byte) {
			case Byte.unknown:
				return this.unknown
			case Byte.any:
				return this.any
			case Byte.boolean:
				return this.boolean
			case Byte.character:
				return this.character
			case Byte.binary:
				return this.binary
			case Byte.integer:
				return this.integer
			case Byte.integer32:
				return this.integer32
			case Byte.integer64:
				return this.integer64
			case Byte.positiveInteger:
				return this.positiveInteger
			case Byte.bigInteger:
				return this.bigInteger
			case Byte.number:
				return this.number
			case Byte.number32:
				return this.number32
			case Byte.number64:
				return this.number64
			case Byte.string:
				return this.string
			case Byte.regularExpression:
				return this.regularExpression
			case Byte.date:
				return this.date
			case Byte.nullable:
				return this.nullable(this.schema())
			case Byte.recall:
				return this.recall(this.positiveInteger())
			case Byte.tuple: {
				const length = this.positiveInteger()
				const dispatchers: Dispatcher[] = []
				for (let i = 0; i < length; i++) dispatchers[i] = this.schema()
				return this.tuple.apply(this, dispatchers)
			}

			default: {
				// if we have an object we add it to the dispatchers memory so that we can recall it
				let dispatcher: Dispatcher
				const index = this.memory.schema.dispatchers.length++

				switch (byte) {
					case Byte.object:
						dispatcher = this.object(this.schemaProperties())
						break
					case Byte.array:
						dispatcher = this.array(this.schema(), this.schemaProperties())
						break
					case Byte.set:
						dispatcher = this.set(this.schema(), this.schemaProperties())
						break
					case Byte.map:
						dispatcher = this.map(this.schema(), this.schemaProperties())
						break
					case Byte.record:
						dispatcher = this.record(this.schema())
						break
					default:
						throw this.error(`Unknown byte`)
				}

				return (this.memory.schema.dispatchers[index] = dispatcher)
			}
		}
	}

	private schemaProperties(): DispatcherRecord {
		const dispatcher: DispatcherRecord = {}
		while (!this.nextByteIs(Byte.stop)) dispatcher[this.string()] = this.schema()
		return dispatcher
	}
}
