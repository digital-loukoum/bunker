import Schema, { isObject, isArray, isObjectRecord, isSet, isMap, isMapRecord } from '../Schema.js'
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

	[Type.Null] = () => {}
	[Type.Undefined] = () => {}
	
	[Type.Any] = ((value: any, schema = guessSchema(value)) => {
		this.writeSchema(schema)
		createDispatcher(schema, this)(value)
	}).bind(this);

	[Type.Boolean] = ((value: boolean) => {
		this.writeChar(value ? 1 : 0)
	}).bind(this);

	[Type.Number] = ((value: number) => {
		this.incrementSizeBy(8)
		this.view.setFloat64(this.size, value)
		this.size += 8
	}).bind(this);

	[Type.Integer] = ((value: number) => {
		this.incrementSizeBy(4)
		this.view.setInt32(this.size, value)
		this.size += 4
	}).bind(this);

	[Type.PositiveInteger] = ((value: number) => {
		this.incrementSizeBy(4)
		this.view.setUint32(this.size, value)
		this.size += 4
	}).bind(this);

	[Type.BigInteger] = ((value: bigint) => {
		this.incrementSizeBy(8)
		this.view.setFloat64(this.size, Number(value))
		this.size += 8
	}).bind(this);

	[Type.Date] = ((value: Date) => {
		this.incrementSizeBy(8)
		this.view.setFloat64(this.size, value.getTime())
		this.size += 8
	}).bind(this);

	[Type.String] = ((value: string) => {
		this.writeString(value)
	}).bind(this);

	[Type.RegExp] = ((value: RegExp) => {
		this.writeString(value.source)
		this.writeChar(0)
		this.writeString(value.flags)
		this.writeChar(0)
	}).bind(this);

	writeChar(value: number) {
		this.incrementSizeBy(1)
		this.view.setUint8(this.size, value)
		this.size++
	}

	writeString(value: string) {
		const encoded = encode(value)
		this.incrementSizeBy(encoded.byteLength)
		this.buffer.set(encoded, this.size)
		this.size += encoded.byteLength
	}

	writeSchema(schema: Schema) {
		if (typeof schema == 'number') {
			this.writeChar(schema)
		}
		
		else if (isObject(schema)) {
			this.writeChar(Type.Object)
			for (const key in schema) {
				this.writeString(key)
				this.writeChar(0)
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
				this.writeChar(0)
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
