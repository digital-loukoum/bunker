import Coder from "../Coder.js"
import Memory, { SchemaMemory } from "../Memory.js"
import Byte from "../Byte.js"
import DataBuffer from "../DataBuffer.js"
import registry from "../registry.js"
import { big1, big128, big64 } from "../bigIntegers.js"
import { stringFromCharCode } from "../stringFromCharCode.js"

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
		// if (this.nextByteIs(Byte.reference)) return this.reference() as Uint8Array
		const length = this.integer()
		const bytes = this.bytes(length)
		return new Uint8Array(bytes)
	}

	uint8Array(): Uint8Array {
		return this.binary()
	}
	uint16Array(): Uint16Array {
		return new Uint16Array(this.binary())
	}
	uint32Array(): Uint32Array {
		return new Uint32Array(this.binary())
	}
	uint8ClampedArray(): Uint8ClampedArray {
		return new Uint8ClampedArray(this.binary())
	}
	int8Array(): Int8Array {
		return new Int8Array(this.binary())
	}
	int16Array(): Int16Array {
		return new Int16Array(this.binary())
	}
	int32Array(): Int32Array {
		return new Int32Array(this.binary())
	}
	float32Array(): Float32Array {
		return new Float32Array(this.binary())
	}
	float64Array(): Float64Array {
		return new Float64Array(this.binary())
	}
	bigInt64Array(): BigInt64Array {
		return new BigInt64Array(this.binary().buffer)
	}
	bigUint64Array(): BigUint64Array {
		return new BigUint64Array(this.binary().buffer)
	}

	arrayBuffer(): ArrayBuffer {
		return this.binary().buffer
	}

	dataView(): DataView {
		return new DataView(this.binary().buffer)
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
		let sign = big1
		let bigint = BigInt(this.byte())
		if (bigint & big128) {
			sign = -big1
			bigint %= big128
		}
		if (bigint & big64) {
			let base = big64
			let byte: number
			bigint %= big64
			do {
				byte = this.byte()
				bigint += base * BigInt(byte % 128)
				base *= big128
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

		const decoded = stringFromCharCode(characters)
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
			case Byte.uint8Array:
				return this.uint8Array
			case Byte.uint16Array:
				return this.uint16Array
			case Byte.uint32Array:
				return this.uint32Array
			case Byte.uint8ClampedArray:
				return this.uint8ClampedArray
			case Byte.int8Array:
				return this.int8Array
			case Byte.int16Array:
				return this.int16Array
			case Byte.int32Array:
				return this.int32Array
			case Byte.float32Array:
				return this.float32Array
			case Byte.float64Array:
				return this.float64Array
			case Byte.bigInt64Array:
				return this.bigInt64Array
			case Byte.bigUint64Array:
				return this.bigUint64Array
			case Byte.arrayBuffer:
				return this.arrayBuffer
			case Byte.dataView:
				return this.dataView
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
