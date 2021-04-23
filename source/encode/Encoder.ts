import Coder from "../Coder"
import Memory from "../Memory"
import Byte from "../Byte"
import augment, { isAugmented } from "../augment"
import DataBuffer from "../DataBuffer"
import schemaOf, { DispatcherWithMemory, hasMemory } from "../schemaOf"
import registry from "../registry"

export type Dispatcher = (value: any) => void
export type DispatcherRecord = Record<string, Dispatcher>

/**
 * The Encoder abstract class implements the encoding logic without the details.
 */
export default abstract class Encoder implements Coder<Dispatcher> {
	size = 0
	memory = new Memory<Dispatcher>()

	abstract onCapacityFull(demandedSize: number): void

	constructor(public capacity = 64, public buffer = new DataBuffer(capacity)) {}

	get data() {
		return new Uint8Array(this.buffer.buffer, 0, this.size)
	}

	byte(value: number) {
		// write a single byte
		this.incrementSizeBy(1)
		this.buffer[this.size++] = value
	}

	bytes(value: Uint8Array) {
		// write an array of bytes
		this.incrementSizeBy(value.byteLength)
		this.buffer.set(value, this.size)
		this.size += value.byteLength
	}

	incrementSizeBy(value: number) {
		const demandedSize = this.size + value
		if (this.capacity < demandedSize) this.onCapacityFull(demandedSize)
	}

	reset() {
		this.memory.objects.length = 0
		this.memory.strings.length = 0
	}

	encode(value: any, schema?: Dispatcher | DispatcherWithMemory): unknown {
		this.reset()
		if (!schema) schema = schemaOf(value)
		if (hasMemory(schema)) {
			this.memory.schema = schema.memory
			this.schema(schema.dispatcher)
			schema.dispatcher.call(this, value)
		} else {
			this.schema(schema)
			schema.call(this, value)
		}
		return this.data
	}

	inMemory(object: object) {
		const index = this.memory.objects.indexOf(object)
		if (~index) {
			this.byte(Byte.reference)
			this.positiveInteger(index)
			return true
		}
		this.memory.objects.push(object)
		return false
	}

	/**
	 * --- Primitives
	 */
	unknown() {
		throw Error(`Call to Encoder::unknown`)
	}

	character(value: number) {
		this.byte(value)
	}

	binary(value: Uint8Array) {
		if (this.inMemory(value)) return
		this.integer(value.byteLength)
		this.bytes(value)
	}

	boolean(value: boolean) {
		this.byte(value ? 1 : 0)
	}

	positiveInteger(value: number) {
		do {
			const nextValue = Math.floor(value / 128)
			this.byte((value % 128) + (nextValue ? 128 : 0))
			value = nextValue
		} while (value)
	}

	integer(value: number) {
		let sign = 0
		if (value < 0 || (value == 0 && Object.is(value, -0))) {
			sign = 128
			value = -value
		}
		const nextValue = Math.floor(value / 64)
		this.byte(sign + (nextValue ? 64 : 0) + (value % 64))
		if (nextValue) this.positiveInteger(nextValue)
	}

	integer32(value: number) {
		this.incrementSizeBy(4)
		this.buffer.view.setInt32(this.size, value)
		this.size += 4
	}

	integer64(value: number | bigint) {
		this.incrementSizeBy(8)
		this.buffer.view.setBigInt64(this.size, BigInt(value))
		this.size += 8
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

	number(value: number) {
		this.incrementSizeBy(8)
		this.buffer.view.setFloat64(this.size, value)
		this.size += 8
	}

	string(value: string) {
		// we check if the string is in memory
		const { length } = value
		if (length > 1) {
			const index = this.memory.strings.indexOf(value)
			if (~index) {
				this.byte(Byte.stringReference)
				this.positiveInteger(index)
				return
			}
			this.memory.strings.push(value)
		}
		let cursor = 0
		while (cursor < length) {
			let byte = value.charCodeAt(cursor++)

			if ((byte & 0xffffff80) === 0) {
				// 1-byte
				this.byte(byte)
				continue
			} else if ((byte & 0xfffff800) === 0) {
				// 2-byte
				this.byte(((byte >> 6) & 0x1f) | 0xc0)
			} else {
				// handle surrogate pair
				if (byte >= 0xd800 && byte <= 0xdbff) {
					// high surrogate
					if (cursor < length) {
						const extra = value.charCodeAt(cursor)
						if ((extra & 0xfc00) === 0xdc00) {
							cursor++
							byte = ((byte & 0x3ff) << 10) + (extra & 0x3ff) + 0x10000
						}
					}
				}

				if ((byte & 0xffff0000) === 0) {
					// 3-byte
					this.byte(((byte >> 12) & 0x0f) | 0xe0)
					this.byte(((byte >> 6) & 0x3f) | 0x80)
				} else {
					// 4-byte
					this.byte(((byte >> 18) & 0x07) | 0xf0)
					this.byte(((byte >> 12) & 0x3f) | 0x80)
					this.byte(((byte >> 6) & 0x3f) | 0x80)
				}
			}

			this.byte((byte & 0x3f) | 0x80)
		}
		this.byte(0)
	}

	regularExpression(value: RegExp) {
		this.string(value.source)
		this.string(value.flags)
	}

	date(value: Date) {
		this.integer(value.getTime())
	}

	any(value: any) {
		const schema = schemaOf(value)
		const memory = this.memory.schema // we save the current schema memory
		this.memory.schema = schema.memory
		this.schema(schema.dispatcher)
		schema.dispatcher.call(this, value)
		this.memory.schema = memory // we recall the legacy schema memory
	}

	/**
	 * --- Constructibles
	 */
	nullable(dispatch: Dispatcher = this.unknown) {
		return augment(
			function (this: Encoder, value: any) {
				if (value === null) this.byte(Byte.null)
				else if (value === undefined) this.byte(Byte.undefined)
				else {
					this.byte(Byte.defined)
					dispatch.call(this, value)
				}
			},
			Encoder.prototype.nullable,
			dispatch
		)
	}

	tuple(...dispatchers: Dispatcher[]) {
		return augment(
			function (this: Encoder, value: any[]) {
				for (let i = 0; i < dispatchers.length; i++) dispatchers[i].call(this, value[i])
			},
			Encoder.prototype.tuple,
			dispatchers
		)
	}

	recall(index: number) {
		// recall a previous dispatcher
		return augment(
			function (this: Encoder, value: object) {
				this.memory.schema.dispatchers[index].call(this, value)
			},
			Encoder.prototype.recall,
			index
		)
	}

	instance(name: string) {
		return augment(
			function (this: Encoder, value: object) {
				registry.entries[name].encode.call(this, value)
			},
			Encoder.prototype.instance,
			name
		)
	}

	/**
	 * --- Objects
	 */
	private properties(properties: DispatcherRecord, value: Record<string, any>) {
		for (const key in properties) properties[key].call(this, value[key])
	}

	object(properties: DispatcherRecord = {}) {
		return augment(
			function (this: Encoder, value: Record<string, any>) {
				if (this.inMemory(value)) return
				this.byte(Byte.object) // first byte
				this.properties(properties, value)
			},
			Encoder.prototype.object,
			properties
		)
	}

	array(dispatch: Dispatcher = this.unknown, properties: DispatcherRecord = {}) {
		return augment(
			function (this: Encoder, value: any[]) {
				if (this.inMemory(value)) return
				this.integer(value.length)
				for (const element of value) dispatch.call(this, element)
				this.properties(properties, value)
			},
			Encoder.prototype.array,
			dispatch,
			properties
		)
	}

	set(dispatch: Dispatcher = this.unknown, properties: DispatcherRecord = {}) {
		return augment(
			function (this: Encoder, value: Set<any>) {
				if (this.inMemory(value)) return
				this.integer(value.size)
				for (const element of value) dispatch.call(this, element)
				this.properties(properties, value)
			},
			Encoder.prototype.set,
			dispatch,
			properties
		)
	}

	map(dispatch: Dispatcher = this.unknown, properties: DispatcherRecord = {}) {
		return augment(
			function (this: Encoder, map: Map<string, any>) {
				if (this.inMemory(map)) return
				this.positiveInteger(map.size)
				for (const [key, value] of map.entries()) {
					this.string(key)
					dispatch.call(this, value)
				}
				this.properties(properties, map)
			},
			Encoder.prototype.map,
			dispatch,
			properties
		)
	}

	/**
	 * Encode the given dispatcher's schema
	 */
	schema(dispatcher: Dispatcher) {
		if (isAugmented(dispatcher))
			switch (dispatcher.target) {
				case this.nullable:
					this.byte(Byte.nullable)
					this.schema(dispatcher["0"])
					return
				case this.tuple:
					this.byte(Byte.tuple)
					this.positiveInteger(dispatcher["0"].length)
					dispatcher["0"].forEach((type: Dispatcher) => this.schema(type))
					return
				case this.recall:
					this.byte(Byte.recall)
					this.positiveInteger(dispatcher["0"])
					return
				case this.object:
					this.byte(Byte.object)
					this.schemaProperties(dispatcher["0"])
					return
				case this.array:
					this.byte(Byte.array)
					this.schema(dispatcher["0"])
					this.schemaProperties(dispatcher["1"])
					return
				case this.set:
					this.byte(Byte.set)
					this.schema(dispatcher["0"])
					this.schemaProperties(dispatcher["1"])
					return
				case this.map:
					this.byte(Byte.map)
					this.schema(dispatcher["0"])
					this.schemaProperties(dispatcher["1"])
					return
				case this.instance: {
					const name = dispatcher["0"]
					this.byte(Byte.instance)
					this.string(name)
					if (!(name in this.memory.classes)) {
						const { encode } = registry.entries[name]
						this.memory.classes[name] = encode
						this.schema(encode)
					}
					return
				}
			}
		else
			switch (dispatcher) {
				case this.unknown:
					return this.byte(Byte.unknown)
				case this.character:
					return this.byte(Byte.character)
				case this.binary:
					return this.byte(Byte.binary)
				case this.boolean:
					return this.byte(Byte.boolean)
				case this.integer:
					return this.byte(Byte.integer)
				case this.positiveInteger:
					return this.byte(Byte.positiveInteger)
				case this.integer32:
					return this.byte(Byte.integer32)
				case this.integer64:
					return this.byte(Byte.integer64)
				case this.bigInteger:
					return this.byte(Byte.bigInteger)
				case this.number:
					return this.byte(Byte.number)
				case this.string:
					return this.byte(Byte.string)
				case this.regularExpression:
					return this.byte(Byte.regularExpression)
				case this.date:
					return this.byte(Byte.date)
				case this.any:
					return this.byte(Byte.any)
			}
		console.error("Unknown dispatcher type:", dispatcher)
		throw Error(`Unknown dispatcher type`)
	}

	private schemaProperties(properties: DispatcherRecord) {
		for (const key in properties) {
			this.string(key)
			this.schema(properties[key])
		}
		this.byte(Byte.stop)
	}
}
