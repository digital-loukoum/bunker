import { encode } from '../utf8string'
import Schema from '../Schema'
import Type from '../Type'
import ArrayOfBuffers from '../ArrayOfBuffers'
import stopToken from '../stopToken'
import { uint8 } from './buffers'


export default function writeSchema(schema: Schema, buffers: ArrayOfBuffers) {
	if (typeof schema == 'object') {
		if (Array.isArray(schema)) {
			buffers.push(uint8(Type.Array))
			writeSchema(schema[0], buffers)
			writeSchema(schema[1] || {}, buffers)
		}
		else {
			buffers.push(uint8(Type.Object))
			for (const key in schema) {
				buffers.push(encode(key))
				buffers.push(stopToken)
				writeSchema(schema[key], buffers)
			}
			buffers.push(stopToken)  // end of object
		}
	}
	else buffers.push(uint8(schema))
}
