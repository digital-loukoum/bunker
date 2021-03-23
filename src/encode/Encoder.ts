import Coder, { Memory } from '../Coder'
import Byte from '../Byte'
import augment, { isAugmented } from '../augment'
import DataBuffer from '../DataBuffer'

export type Dispatcher = (value: any) => void
export type DispatcherRecord = Record<string, Dispatcher>

const infinity = Uint8Array.of(64, 64)
const minusInfinity = Uint8Array.of(192, 64)
const nan = Uint8Array.of(64, 32)

/**
 * The Encoder abstract class implements the encoding logic without the details.
 */
export default abstract class Encoder implements Coder<Dispatcher> {
	size = 0
	memory = new Memory<Dispatcher>()

	abstract onCapacityFull(demandedSize: number): void

	constructor(
		public capacity = 64,
		public buffer = new DataBuffer(capacity)
	) {}

	get data() {
		return new Uint8Array(this.buffer.buffer, 0, this.size)
	}

	byte(value: number) {  // write a single byte
		this.incrementSizeBy(1)
		this.buffer[this.size++] = value
	}

	bytes(value: Uint8Array) {  // write an array of bytes
		this.incrementSizeBy(value.byteLength)
		this.buffer.set(value, this.size)
		this.size += value.byteLength
	}

	incrementSizeBy(value: number) {
		const demandedSize = this.size + value
		if (this.capacity < demandedSize)
			this.onCapacityFull(demandedSize)
	}

	reset() {
		this.memory.objects.length = 0
		this.memory.strings.length = 0
	}

	encode(value: any, dispatch?: Dispatcher): Uint8Array {
		this.reset()
		if (!dispatch) dispatch = this.dispatcher(value)
		this.schema(dispatch)
		dispatch.call(this, value)
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
			this.byte(value % 128 + (nextValue ? 128 : 0))
			value = nextValue
		} while (value)
	}

	smallInteger(value: number) {
		return this.integer(value)
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

	/**
	 * The Bunker's number format converts a number to a base 10 representation,
	 * Then every digit is converted to a semi-byte number going from 0 to 9.
	 * Those semi-bytes are finally concatenated into a Uint8Array.
	 * Since we naturally write numbers in their base-10 representation, it's often
	 * shorter to store decimal numbers in this format.
	 * @enhancement This function would be much faster if compiled to wasm because
	 * we could omit the intermediate conversion to UTF-16 string.
	 */
	number(value: number) {
		if (value == Infinity) return this.byte(206)
		else if (value == -Infinity) return this.byte(222)
		else if (isNaN(value)) return this.byte(238)
		const stringified = '' + value
		const bytes = new Uint8Array(Math.ceil((stringified.length + 1) / 2))

		let offset = 0, index = 0
		while (index < stringified.length) {
			const value = this.numberCharacterSemiByte(stringified[index++])
			if (index % 2) bytes[offset] = value * 16
			else bytes[offset++] += value
		}

		// we add the stop semi-byte (15)
		if (index % 2) bytes[offset] += 15
		else bytes[offset] = 15 * 16
		this.bytes(bytes)
	}

	private numberCharacterSemiByte(character: string) {
		switch (character) {
			case '0': return 0
			case '1': return 1
			case '2': return 2
			case '3': return 3
			case '4': return 4
			case '5': return 5
			case '6': return 6
			case '7': return 7
			case '8': return 8
			case '9': return 9
			case '.': return 10
			case '+': return 11
			case '-': return 12
			case 'e': return 13
			case 'i': return 14  // should not happen ; infinity is a special case
			default: throw `Unexpected character in number: '${character}'`
		}
	}

	number32(value: number) {
		this.incrementSizeBy(4)
		this.buffer.view.setFloat32(this.size, value)
		this.size += 4
	}

	number64(value: number) {
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
			}
			else if ((byte & 0xfffff800) === 0) {
				// 2-byte
				this.byte(((byte >> 6) & 0x1f) | 0xc0)
			}
			else {
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
				}
				else {
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
		const dispatch = this.dispatcher(value)
		this.schema(dispatch)
		dispatch.call(this, value)
	}

	/**
	 * --- Constructibles
	 */
	nullable(dispatch: Dispatcher = this.unknown) {
		return augment(function(this: Encoder, value: any) {
			if (value === null)
				this.byte(Byte.null)
			else if (value === undefined)
				this.byte(Byte.undefined)
			else {
				this.byte(Byte.defined)
				dispatch.call(this, value)
			}
		}, this.nullable, dispatch)
	}

	tuple(dispatchers: Dispatcher[] = []) {
		return augment(function(this: Encoder, value: any[]) {
			for (let i = 0; i < dispatchers.length; i++)
			dispatchers[i].call(this, value[i])
		}, this.tuple, dispatchers)
	}

	recall(index: number) {  // recall a previous dispatcher
		return augment(function(this: Encoder, value: object) {
			this.memory.schema.dispatchers[index].call(this, value)
		}, this.recall, index)
	}

	/**
	 * --- Objects
	 */
	private properties(properties: DispatcherRecord, value: Record<string, any>) {
		for (const key in properties) properties[key].call(this, value[key])
	}

	object(properties: DispatcherRecord = {}) {
		return augment(function(this: Encoder, value: Record<string, any>) {
			if (this.inMemory(value)) return
			this.byte(Byte.object)  // first byte
			this.properties(properties, value)
		}, this.object, properties)
	}

	array(dispatch: Dispatcher = this.unknown, properties: DispatcherRecord = {}) {
		return augment(function(this: Encoder, value: any[]) {
			if (this.inMemory(value)) return
			this.integer(value.length)
			for (const element of value)
				dispatch.call(this, element)
			this.properties(properties, value)
		}, this.array, dispatch, properties)
	}

	set(dispatch: Dispatcher = this.unknown, properties: DispatcherRecord = {}) {
		return augment(function(this: Encoder, value: Set<any>) {
			if (this.inMemory(value)) return
			this.integer(value.size)
			for (const element of value)
				dispatch.call(this, element)
			this.properties(properties, value)
		}, this.set, dispatch, properties)
	}

	record(dispatch: Dispatcher = this.unknown) {
		return augment(function(this: Encoder, value: Record<string, any>) {
			if (this.inMemory(value)) return
			this.positiveInteger(Object.keys(value).length)
			for (const key in value) {
				this.string(key)
				dispatch.call(this, value[key])
			}
		}, this.record, dispatch)
	}

	map(dispatch: Dispatcher = this.unknown, properties: DispatcherRecord = {}) {
		return augment(function(this: Encoder, map: Map<string, any>) {
			if (this.inMemory(map)) return
			this.positiveInteger(map.size)
			for (const [key, value] of map.entries()) {
				this.string(key)
				dispatch.call(this, value)
			}
			this.properties(properties, map)
		}, this.map, dispatch, properties)
	}


	/**
	 * Return the default dispatcher of a value (ie guess its schema)
	 */
	dispatcher(value: any): (value: any) => void {
		switch (typeof value) {
			case 'undefined': return this.nullable()
			case 'number': {
				const isSmall = (Math.fround(value) == value)
				if (Number.isInteger(value)) return isSmall ? this.smallInteger : this.integer
				else return isSmall ? this.number32 : this.number64
			}
			case 'bigint': return this.bigInteger
			case 'string': return this.string
			case 'boolean': return this.boolean
			case 'function': throw `Cannot encode a function into bunker data`
			default: {
				if (value == null) return this.nullable()
				if (value instanceof Date) return this.date
				if (value instanceof RegExp) return this.regularExpression

				// new object
				let index = this.memory.schema.objects.indexOf(value)
				if (~index) return this.recall(index)
				index = this.memory.schema.objects.length
				this.memory.schema.objects.push(value)

				let dispatcher: Dispatcher
				if (value instanceof Array) dispatcher = this.arrayDispatcher(value)
				else if (value instanceof Set) dispatcher = this.setDispatcher(value)
				else if (value instanceof Map) dispatcher = this.mapDispatcher(value)
				else dispatcher = this.object(this.propertiesDispatcher(value))

				return (this.memory.schema.dispatchers[index] = dispatcher)
			}
		}
	}

	private propertiesDispatcher(value: Record<string, any>) {
		let properties: DispatcherRecord = {}
		for (const key in value) properties[key] = this.dispatcher(value[key])
		return properties
	}

	private arrayDispatcher(value: any[]) {
		let dispatch: Dispatcher = this.unknown
		let properties: DispatcherRecord = {}
		let index = 0, indexes = 0
		for (let i = 0; i < value.length; i++) {
			if (i in value) indexes++  // empty values are not indexed
			dispatch = this.joinDispatchers(dispatch, this.dispatcher(value[i]))
		}
		for (const key in value) {
			if (index++ < indexes) continue  // the first keys are always the array values
			properties[key] = this.dispatcher(value[key])
		}
		return this.array(dispatch, properties)
	}

	private setDispatcher(value: Set<any>) {
		let type: Dispatcher = this.unknown
		for (const element of value) type = this.joinDispatchers(type, this.dispatcher(element))
		return this.set(type, this.propertiesDispatcher(value))
	}

	private mapDispatcher(value: Map<string, any>) {
		let type: Dispatcher = this.unknown
		for (const element of value.values()) type = this.joinDispatchers(type, this.dispatcher(element))
		return this.map(type, this.propertiesDispatcher(value))
	}

	private joinDispatchers(a: Dispatcher, b: Dispatcher): Dispatcher {
		let nullable = false
		let joint: Dispatcher
		if (isAugmented(a)) {
			if (a.target == this.nullable) {
				nullable = true
				a = a['0']
			}
			else if (a.target == this.recall) {
				if (isAugmented(b) && b.target == this.recall && b['0'] == a['0'])
					return a  // a & b recall the same dispatcher
				a = this.memory.schema.dispatchers[a['0']]
				if (!a) return this.any  // recursive type deduction ; we don't know the type of a yet
			}
		}
		if (isAugmented(b)) {
			if (b.target == this.nullable) {
				nullable = true
				b = b['0']
			}
			else if (b.target == this.recall) {
				b = this.memory.schema.dispatchers[b['0']]
				if (!b) return this.any
			}
		}

		if (a == this.unknown) joint = b
		else if (b == this.unknown) joint = a
		else if (!isAugmented(a) || !isAugmented(b))
			joint = this.joinPrimitives(a, b)
		else {  // -- join objects
			if (a.target != b.target) {
				joint = this.any
			}
			else if (a.target == this.object) {
				joint = this.object(this.joinDispatcherProperties(a['0'], b['0']))
			}
			else if (a.target == this.array) {
				joint = this.array(
					this.joinDispatchers(a['0'], b['0']),
					this.joinDispatcherProperties(a['1'], b['1'])
				)
			}
			else if (a.target == this.recall) {
				if (a['0'] == b['0']) joint = a  // same reference
				else joint = this.any  // different references
			}
			else if (a.target == this.set) {
				joint = this.set(
					this.joinDispatchers(a['0'], b['0']),
					this.joinDispatcherProperties(a['1'], b['1'])
				)
			}
			else if (a.target == this.map) {
				joint = this.map(
					this.joinDispatchers(a['0'], b['0']),
					this.joinDispatcherProperties(a['1'], b['1'])
				)
			}
			else if (a.target == this.record) {
				joint = this.record(this.joinDispatchers(a['0'], b['0']))
			}
			else joint = this.any
		}

		return nullable ? this.nullable(joint) : joint
	}

	private joinDispatcherProperties(a: DispatcherRecord, b: DispatcherRecord): DispatcherRecord {
		const dispatcher: DispatcherRecord = {}
		for (const key in a)
			dispatcher[key] = key in b ? this.joinDispatchers(a[key], b[key]) : this.nullable(a[key])
		for (const key in b)
			if (!(key in a))  // key exists in b but not in a
				dispatcher[key] = this.nullable(b[key])
		return dispatcher
	}

	private joinPrimitives(a: Dispatcher, b: Dispatcher) {
		if (a == b) return a
		const numbers = [this.smallInteger, this.integer, this.number32, this.number64]
		const indexA = numbers.indexOf(a); if (indexA == -1) return this.any
		const indexB = numbers.indexOf(b); if (indexB == -1) return this.any
		const max = Math.max(indexA, indexB)
		if (max == 2 && (indexA == 1 || indexB == 1)) return this.number64
		return numbers[max]
	}


	/**
	 * Encode the given dispatcher's schema
	 */
	schema(dispatcher: Dispatcher) {
		if (isAugmented(dispatcher)) switch (dispatcher.target) {
			case this.nullable:
				this.byte(Byte.nullable)
				this.schema(dispatcher['0'])
				return
			case this.tuple:
				this.byte(Byte.tuple)
				this.positiveInteger(dispatcher['0'].length)
				dispatcher['0'].forEach((type: Dispatcher) => this.schema(type))
				return
			case this.recall:
				this.byte(Byte.recall)
				this.positiveInteger(dispatcher['0'])
				return
			case this.object:
				this.byte(Byte.object)
				this.schemaProperties(dispatcher['0'])
				return
			case this.array:
				this.byte(Byte.array)
				this.schema(dispatcher['0'])
				this.schemaProperties(dispatcher['1'])
				return
			case this.set:
				this.byte(Byte.set)
				this.schema(dispatcher['0'])
				this.schemaProperties(dispatcher['1'])
				return
			case this.map:
				this.byte(Byte.map)
				this.schema(dispatcher['0'])
				this.schemaProperties(dispatcher['1'])
				return
			case this.record:
				this.byte(Byte.record)
				this.schema(dispatcher['0'])
				return
		}
		else switch (dispatcher) {
			case this.unknown: return this.byte(Byte.unknown)
			case this.character: return this.byte(Byte.character)
			case this.binary: return this.byte(Byte.binary)
			case this.boolean: return this.byte(Byte.boolean)
			case this.smallInteger:
			case this.integer: return this.byte(Byte.integer)
			case this.positiveInteger: return this.byte(Byte.positiveInteger)
			case this.integer32: return this.byte(Byte.integer32)
			case this.bigInteger: return this.byte(Byte.bigInteger)
			case this.number: return this.byte(Byte.number)
			case this.number32: return this.byte(Byte.number32)
			case this.number64: return this.byte(Byte.number64)
			case this.string: return this.byte(Byte.string)
			case this.regularExpression: return this.byte(Byte.regularExpression)
			case this.date: return this.byte(Byte.date)
			case this.any: return this.byte(Byte.any)
		}
		console.error('Unknown dispatcher type:', dispatcher)
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