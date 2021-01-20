import Schema, { isObject, isArray, isObjectRecord, isSet, isMap, isMapRecord } from '../Schema.js'
import { encode } from '../utf8string'
import Type from '../Type'

export default class Encoder {
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

	writeUint8(value: number) {
		this.incrementSizeBy(1)
		this.view.setUint8(this.size, value)
		this.size++
	}
  
	writeInt8(value: number) {
		this.incrementSizeBy(1)
		this.view.setInt8(this.size, value)
		this.size++
	}
  
	writeUint16(value: number) {
		this.incrementSizeBy(2)
		this.view.setUint16(this.size, value)
		this.size += 2
	}
  
	writeInt16(value: number) {
		this.incrementSizeBy(2)
		this.view.setInt16(this.size, value)
		this.size += 2
	}
  
	writeUint32(value: number) {
		this.incrementSizeBy(4)
		this.view.setUint32(this.size, value)
		this.size += 4
	}
  
	writeInt32(value: number) {
		this.incrementSizeBy(4)
		this.view.setInt32(this.size, value)
		this.size += 4
	}
  
	writeFloat32(value: number) {
		this.incrementSizeBy(4)
		this.view.setFloat32(this.size, value)
		this.size += 4
	}
  
	writeFloat64(value: number) {
		this.incrementSizeBy(8)
		this.view.setFloat64(this.size, value)
		this.size += 8
	}

	writeString(value: string) {
		const encoded = encode(value)
		this.incrementSizeBy(encoded.byteLength)
		this.buffer.set(encoded, this.size)
		this.size += encoded.byteLength
	}

	writeSchema(schema: Schema) {
		if (typeof schema == 'number') {
			this.writeUint8(schema)
		}
		
		else if (isObject(schema)) {
			this.writeUint8(Type.Object)
			for (const key in schema) {
				this.writeString(key)
				this.writeUint8(0)
				this.writeSchema(schema[key])
			}
			this.writeUint8(0)  // end of object
		}
	
		else if (isObjectRecord(schema)) {
			this.writeUint8(Type.ObjectRecord)
			this.writeSchema(schema.type)
		}
	
		else if (isArray(schema)) {
			this.writeUint8(Type.Array)
			this.writeSchema(schema[0])
			this.writeSchema(schema[1] || {})
		}
	
		else if (isSet(schema)) {
			this.writeUint8(Type.Set)
			this.writeSchema(schema.values().next().value)
		}
	
		else if (isMap(schema)) {
			this.writeUint8(Type.Map)
			for (const [key, value] of schema.entries()) {
				this.writeString(key)
				this.writeUint8(0)
				this.writeSchema(value)
			}
			this.writeUint8(0)  // end of object
		} 
	
		else if (isMapRecord(schema)) {
			this.writeUint8(Type.MapRecord)
			this.writeSchema(schema.type)
		}
	}
}
