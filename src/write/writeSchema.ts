import { encode } from '../utf8string'
import Schema, { isObject, isArray, isObjectRecord, isSet, isMap, isMapRecord } from '../Schema'
import Type from '../Type'
import ArrayOfBuffers from './ArrayOfBuffers'
import stopToken from '../stopToken'
import { uint8 } from './buffers'


export default function writeSchema(schema: Schema, buffers: ArrayOfBuffers) {
	if (typeof schema == 'number')
		buffers.push(uint8(schema))
	
	else if (isObject(schema)) {
		buffers.push(uint8(Type.Object))
		for (const key in schema) {
			buffers.push(encode(key))
			buffers.push(stopToken)
			writeSchema(schema[key], buffers)
		}
		buffers.push(stopToken)  // end of object
	}

	else if (isObjectRecord(schema)) {
		buffers.push(uint8(Type.ObjectRecord))
		writeSchema(schema.type, buffers)
	}

	else if (isArray(schema)) {
		buffers.push(uint8(Type.Array))
		writeSchema(schema[0], buffers)
		writeSchema(schema[1] || {}, buffers)
	}

	else if (isSet(schema)) {
		buffers.push(uint8(Type.Set))
		writeSchema(schema.values().next().value, buffers)
	}

	else if (isMap(schema)) {
		buffers.push(uint8(Type.Map))
		for (const [key, value] of schema.entries()) {
			buffers.push(encode(key))
			buffers.push(stopToken)
			writeSchema(value, buffers)
		}
		buffers.push(stopToken)  // end of object
	} 

	else if (isMapRecord(schema)) {
		buffers.push(uint8(Type.MapRecord))
		writeSchema(schema.type, buffers)
	}
}
