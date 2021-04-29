import Coder from "../Coder"
import Memory, { SchemaMemory } from "../Memory"
import Byte from "../Byte"
import DataBuffer from "../DataBuffer"
import registry from "../registry"

export type Dispatcher = (_?: any) => any
export type DispatcherRecord = Record<string, Dispatcher>

export default abstract class Decoder implements Coder<Dispatcher> {
	memory = new Memory<Dispatcher>()

	constructor(public buffer = new DataBuffer(), public cursor = 0) {}

	reset() {
		this.memory.objects.length = 0
		this.memory.strings.length = 0
		this.cursor = 0
	}

	decode(): unknown {
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
		const memory = this.memory.schema
		this.memory.schema = new SchemaMemory()
		const value = this.schema().call(this)
		this.memory.schema = memory
		return value
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
		return function (this: Decoder): unknown {
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

	tuple(dispatchers: [...Dispatcher[]]) {
		return function (this: Decoder, constructor = Array): [...any] {
			const tuple = new constructor()
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

	instance(name: string) {
		const { constructor } = registry.entries[name]
		const decode = this.memory.classes[name]
		return function (this: Decoder): unknown {
			// we store the current schema memory in a variable and use the memory of the constructor's schema
			return decode.call(this, constructor)
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
		return function (this: Decoder, constructor = Object) {
			if (this.byte() == Byte.reference) return this.reference() as Record<string, any>
			const object = new constructor()
			this.memory.objects.push(object)
			return this.properties(object, properties)
		}
	}

	array(dispatch: Dispatcher = this.unknown, properties: DispatcherRecord = {}) {
		return function (this: Decoder, constructor = Array) {
			if (this.isReference()) return this.reference() as any[]
			const array = new constructor()
			array.length = this.integer()
			this.memory.objects.push(array)
			for (let i = 0; i < array.length; i++) array[i] = dispatch.call(this)
			return this.properties(array, properties)
		}
	}

	set(dispatch: Dispatcher = this.unknown, properties: DispatcherRecord = {}) {
		return function (this: Decoder, constructor = Set) {
			if (this.isReference()) return this.reference() as Set<any>
			const set = new constructor()
			const length = this.integer()
			this.memory.objects.push(set)
			for (let i = 0; i < length; i++) set.add(dispatch.call(this))
			return this.properties(set, properties)
		}
	}

	map(
		[keyDispatcher, valueDispatcher]: [Dispatcher, Dispatcher],
		properties: DispatcherRecord = {}
	) {
		return function (this: Decoder, constructor = Map) {
			if (this.isReference()) return this.reference() as Map<string, any>
			const map = new constructor() as Map<string, any>
			const length = this.integer()
			this.memory.objects.push(map)
			for (let i = 0; i < length; i++)
				map.set(keyDispatcher.call(this), valueDispatcher.call(this))
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
			case Byte.positiveInteger:
				return this.positiveInteger
			case Byte.bigInteger:
				return this.bigInteger
			case Byte.number:
				return this.number
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
			case Byte.instance: {
				const name = this.string()
				if (!(name in this.memory.classes)) {
					// we do double assignment because this.schema() needs to know
					// that 'name' has already been encountered
					this.memory.classes[name] = this.unknown
					this.memory.classes[name] = this.schema()
				}
				return this.instance(name)
			}
			case Byte.tuple: {
				const length = this.positiveInteger()
				const dispatchers: Dispatcher[] = []
				for (let i = 0; i < length; i++) dispatchers[i] = this.schema()
				return this.tuple(dispatchers)
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
						dispatcher = this.map([this.schema(), this.schema()], this.schemaProperties())
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
