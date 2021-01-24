import Schema, { isObject, isArray, isObjectRecord, isSet, isMap, isMapRecord, isPrimitive, isNullable } from '../Schema.js'
import { encode } from '../utf8string'
import Type from '../Type'
import Writer from './Writer'
import guessSchema from '../guessSchema'
import createDispatcher from '../createDispatcher'

export default class BufferWriter extends Writer {
	private size = 0
	private capacity = 64
	private buffer = new Uint8Array(this.capacity)
	private view = new DataView(this.buffer.buffer)

	get data() {
		return new Uint8Array(this.buffer.buffer, 0, this.size)
	}

	private incrementSizeBy(value: number) {
		const requiredSize = this.size + value
		if (this.capacity < requiredSize)
			this.resizeBuffer(requiredSize)
	}
  
	private resizeBuffer(newSize: number) {
		if (this.capacity == 64)
			this.capacity = 4096
		while (this.capacity < newSize)
			this.capacity *= 2
		const newBuffer = new ArrayBuffer(this.capacity)
		const newBytes = new Uint8Array(newBuffer)
		const newView = new DataView(newBuffer)
		newBytes.set(this.buffer)
		this.view = newView
		this.buffer = newBytes
	}

	[Type.Null] = (value: null | undefined) => {
		this.writeChar(value === undefined ? 1 : 0)
	};
	
	[Type.Any] = (value: any, schema = guessSchema(value)) => {
		this.writeSchema(schema)
		createDispatcher(schema, this)(value)
	};

	[Type.Boolean] = (value: boolean) => {
		this.writeChar(value ? 1 : 0)
	};

	[Type.Character] = this.writeChar;

	[Type.Number] = (value: number) => {
		this.incrementSizeBy(8)
		this.view.setFloat64(this.size, value)
		this.size += 8
	};

	[Type.Integer] = (value: number) => {
		let sign = 0
		if (value < 0 ||( value == 0 && Object.is(value, -0))) {
			sign = 128
			value = -value
		}
		const nextValue = Math.floor(value / 64)
		this.writeChar(sign + (nextValue ? 64: 0) + (value % 64))
		if (nextValue) this[Type.PositiveInteger](nextValue)
	};

	[Type.PositiveInteger] = (value: number) => {
		do {
			const nextValue = Math.floor(value / 128)
			this.writeChar(value % 128 + (nextValue ? 128 : 0))
			value = nextValue
		} while (value)
	};

	[Type.BigInteger] = (value: bigint) => {
		let sign = 0
		if (value < 0n) {
			sign = 128
			value = -value
		}
		let nextValue = value / 64n
		this.writeChar(sign + (nextValue ? 64 : 0) + Number(value % 64n))
		if (nextValue) {
			value = nextValue
			do {
				nextValue = value / 128n
				this.writeChar((nextValue ? 128 : 0) + Number(value % 128n))
				value = nextValue
			} while (value)
		}
	};

	[Type.Date] = (value: Date) => {
		this.incrementSizeBy(8)
		this.view.setFloat64(this.size, value.getTime())
		this.size += 8
	};

	[Type.String] = this.writeString.bind(this);

	[Type.RegExp] = (value: RegExp) => {
		this.writeString(value.source)
		this.writeString(value.flags)
	};

	writeChar(value: number) {
		this.incrementSizeBy(1)
		this.view.setUint8(this.size, value)
		this.size++
	}

	writeString(value: string) {
		const encoded = encode(value)
		this.incrementSizeBy(encoded.byteLength + 1)
		this.buffer.set(encoded, this.size)
		this.size += encoded.byteLength
		this.view.setUint8(this.size++, 0)
	}

	writeSchema(schema: Schema) {
		if (isPrimitive(schema)) {
			this.writeChar(schema)
		}

		else if (isNullable(schema)) {
			this.writeChar(Type.Nullable)
			this.writeSchema(schema.type)
		}
		
		else if (isObject(schema)) {
			this.writeChar(Type.Object)
			for (const key in schema) {
				this.writeString(key)
				this.writeSchema(schema[key])
			}
			this.writeChar(0)  // end of object
		}
	
		else if (isObjectRecord(schema)) {
			this.writeChar(Type.ObjectRecord)
			this.writeSchema(schema.type)
		}
	
		else if (isArray(schema)) {
			this.writeChar(Type.Array)
			this.writeSchema(schema[0])
			this.writeSchema(schema[1] || {})
		}
	
		else if (isSet(schema)) {
			this.writeChar(Type.Set)
			this.writeSchema(schema.values().next().value)
		}
	
		else if (isMap(schema)) {
			this.writeChar(Type.Map)
			for (const [key, value] of schema.entries()) {
				this.writeString(key)
				this.writeSchema(value)
			}
			this.writeChar(0)  // end of object
		} 
	
		else if (isMapRecord(schema)) {
			this.writeChar(Type.MapRecord)
			this.writeSchema(schema.type)
		}
	}
}
