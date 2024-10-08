import Coder from "../Coder.js"
import Memory from "../Memory.js"
import Byte from "../Byte.js"
import augment, { Augmented, isAugmented } from "../augment.js"
import DataBuffer from "../DataBuffer.js"
import schemaOf, { DispatcherWithMemory, hasMemory } from "../schemaOf.js"
import registry from "../registry.js"
import { big0, big128, big64 } from "../bigIntegers.js"

export type Dispatcher<Type = any> = (value: Type) => void
export type DispatcherRecord<Type = any> = Record<string, Dispatcher<Type>>
export type PropertiesDispatcher<O> = { [K in keyof O]: Dispatcher<O[K]> }

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

	encode(value: any, schema?: Dispatcher | DispatcherWithMemory): any {
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
		// if (this.inMemory(value)) return
		this.integer(value.byteLength)
		this.bytes(value)
	}

	uint8Array(value: Uint8Array) {
		this.binary(value)
	}

	uint16Array(value: Uint16Array) {
		this.binary(new Uint8Array(value))
	}

	uint32Array(value: Uint32Array) {
		this.binary(new Uint8Array(value))
	}

	uint8ClampedArray(value: Uint8ClampedArray) {
		this.binary(new Uint8Array(value))
	}

	int8Array(value: Int8Array) {
		this.binary(new Uint8Array(value))
	}

	int16Array(value: Int16Array) {
		this.binary(new Uint8Array(value))
	}

	int32Array(value: Int32Array) {
		this.binary(new Uint8Array(value))
	}

	float32Array(value: Float32Array) {
		this.binary(new Uint8Array(value))
	}

	float64Array(value: Float64Array) {
		this.binary(new Uint8Array(value))
	}

	bigInt64Array(value: BigInt64Array) {
		this.binary(new Uint8Array(value.buffer))
	}

	bigUint64Array(value: BigUint64Array) {
		this.binary(new Uint8Array(value.buffer))
	}

	arrayBuffer(value: ArrayBuffer) {
		this.binary(new Uint8Array(value))
	}

	dataView(value: DataView) {
		this.binary(new Uint8Array(value.buffer))
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

	bigInteger(value: bigint) {
		let sign = 0
		if (value < big0) {
			sign = 128
			value = -value
		}
		let nextValue = value / big64
		this.byte(sign + (nextValue ? 64 : 0) + Number(value % big64))
		if (nextValue) {
			value = nextValue
			do {
				nextValue = value / big128
				this.byte((nextValue ? 128 : 0) + Number(value % big128))
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
	nullable<T>(dispatch: Dispatcher<T> = this.unknown) {
		return augment(
			function (this: Encoder, value: T | null | undefined) {
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

	tuple<Tuple extends [...unknown[]]>(dispatchers: {
		[Index in keyof Tuple]: Dispatcher<Tuple[Index]>
	}) {
		return augment(
			function (this: Encoder, value: Tuple) {
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
	private properties(
		properties: DispatcherRecord | undefined,
		value: Record<string, any>
	) {
		if (properties) for (const key in properties) properties[key].call(this, value[key])
	}

	object<O extends object>(properties: PropertiesDispatcher<O>) {
		return augment(
			function (this: Encoder, value: O) {
				if (this.inMemory(value)) return
				this.byte(Byte.object) // first byte
				this.properties(properties, value)
			},
			Encoder.prototype.object,
			properties
		)
	}

	array<T>(dispatch: Dispatcher<T>): Augmented<(this: Encoder, value: T[]) => void>
	array<T, P>(
		dispatch: Dispatcher<T>,
		properties: PropertiesDispatcher<P>
	): Augmented<(this: Encoder, value: T[] & P) => void>
	array<T, P extends object>(
		dispatch: Dispatcher<T>,
		properties?: PropertiesDispatcher<P>
	) {
		return augment(
			function (this: Encoder, value: T[] & P) {
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

	set<T>(dispatch: Dispatcher<T>): Augmented<(this: Encoder, value: Set<T>) => void>
	set<T, P>(
		dispatch: Dispatcher<T>,
		properties: PropertiesDispatcher<P>
	): Augmented<(this: Encoder, value: Set<T> & P) => void>
	set<T, P extends object>(
		dispatch: Dispatcher<T>,
		properties?: PropertiesDispatcher<P>
	) {
		return augment(
			function (this: Encoder, value: Set<T> & P) {
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

	map<K, V>([keyDispatcher, valueDispatcher]: [Dispatcher<K>, Dispatcher<V>]): Augmented<
		(this: Encoder, value: Map<K, V>) => void
	>
	map<K, V, P>(
		[keyDispatcher, valueDispatcher]: [Dispatcher<K>, Dispatcher<V>],
		properties: PropertiesDispatcher<P>
	): Augmented<(this: Encoder, value: Map<K, V> & P) => void>
	map<K, V, P>(
		[keyDispatcher, valueDispatcher]: [Dispatcher<K>, Dispatcher<V>],
		properties?: PropertiesDispatcher<P>
	) {
		return augment(
			function (this: Encoder, map: Map<K, V> & P) {
				if (this.inMemory(map)) return
				this.positiveInteger(map.size)
				for (const [key, value] of map.entries()) {
					keyDispatcher.call(this, key)
					valueDispatcher.call(this, value)
				}
				this.properties(properties, map)
			},
			Encoder.prototype.map,
			keyDispatcher,
			valueDispatcher,
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
					this.schema(dispatcher["1"])
					this.schemaProperties(dispatcher["2"])
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
				case this.uint8Array:
					return this.byte(Byte.uint8Array)
				case this.uint16Array:
					return this.byte(Byte.uint16Array)
				case this.uint32Array:
					return this.byte(Byte.uint32Array)
				case this.uint8ClampedArray:
					return this.byte(Byte.uint8ClampedArray)
				case this.int8Array:
					return this.byte(Byte.int8Array)
				case this.int16Array:
					return this.byte(Byte.int16Array)
				case this.int32Array:
					return this.byte(Byte.int32Array)
				case this.float32Array:
					return this.byte(Byte.float32Array)
				case this.float64Array:
					return this.byte(Byte.float64Array)
				case this.bigInt64Array:
					return this.byte(Byte.bigInt64Array)
				case this.bigUint64Array:
					return this.byte(Byte.bigUint64Array)
				case this.arrayBuffer:
					return this.byte(Byte.arrayBuffer)
				case this.dataView:
					return this.byte(Byte.dataView)
				case this.boolean:
					return this.byte(Byte.boolean)
				case this.integer:
					return this.byte(Byte.integer)
				case this.positiveInteger:
					return this.byte(Byte.positiveInteger)
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
