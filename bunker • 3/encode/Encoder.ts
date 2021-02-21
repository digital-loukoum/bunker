import Coder from '../Coder'
import Byte from '../Byte'
import augment, { isAugmented } from '../augment'

export type Dispatcher = (value: any) => void
export type DispatcherRecord = Record<string, Dispatcher>

const infinity = new Uint8Array([64, 64])
const minusInfinity = new Uint8Array([192, 64])
const nan = new Uint8Array([64, 32])

/**
 * The Encoder abstract class implements the encoding logic without the details.
 */
export default abstract class Encoder implements Coder<Dispatcher> {
	memory: object[] = []
	stringMemory: string[] = []  // array of all strings encountered
	encodeString = TextEncoder.prototype.encode.bind(new TextEncoder)

	abstract data: Uint8Array
	abstract byte(value: number): void  // write a single byte
	abstract bytes(value: Uint8Array): void  // write an array of bytes

	abstract dispatcher(value: any): Dispatcher  // return the right dispatcher of a given value

	encode(value: any): Uint8Array {
		this.any(value)
		return this.data
	}

	inMemory(object: object) {
		const index = this.memory.indexOf(object)
		if (~index) {
			this.byte(Byte.reference)
			this.positiveInteger(index)
			return true
		}
		this.memory.push(object)
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
	
	boolean(value: boolean) {
		this.byte(value ? 1 : 0)
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

	positiveInteger(value: number) {
		do {
			const nextValue = Math.floor(value / 128)
			this.byte(value % 128 + (nextValue ? 128 : 0))
			value = nextValue
		} while (value)
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
		if (value == Infinity) return this.bytes(infinity)
		else if (value == -Infinity) return this.bytes(minusInfinity)
		else if (isNaN(value)) return this.bytes(nan)
		let [integer, decimals] = value.toString().split('.')
		let mantissa = 0
		let exponent = 0
		if (decimals) {
			mantissa = +(integer + decimals)
			exponent = -(decimals.length)
		}
		else {
			while (integer[integer.length - exponent - 1] == '0') exponent++;
			mantissa = +(integer.slice(0, -exponent))
		}
		this.integer(exponent)
		this.integer(mantissa)
	}

	string(value: string) {
		if (value.length > 1) {
			const index = this.stringMemory.indexOf(value)
			if (~index) {
				this.byte(Byte.stringReference)
				this.positiveInteger(index)
				return
			}
			this.stringMemory.push(value)
		}
		this.bytes(this.encodeString(value))
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
		return augment(function(this: Encoder, value: [...any]) {
			for (let i = 0; i < dispatchers.length; i++)
			dispatchers[i].call(this, value[i])
		}, this.tuple, dispatchers)
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
	 * --- Schema
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
				dispatcher['0'].forEach((type: Dispatcher) => this.schema(type))
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
			case this.boolean: return this.byte(Byte.boolean)
			case this.integer: return this.byte(Byte.integer)
			case this.positiveInteger: return this.byte(Byte.positiveInteger)
			case this.bigInteger: return this.byte(Byte.bigInteger)
			case this.number: return this.byte(Byte.number)
			case this.string: return this.byte(Byte.string)
			case this.regularExpression: return this.byte(Byte.regularExpression)
			case this.date: return this.byte(Byte.date)
			case this.any: return this.byte(Byte.any)
		}
		console.error('Unknown dispatcher type:', dispatcher)
		console.log("this.nullable", this.nullable, this.nullable == dispatcher)
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