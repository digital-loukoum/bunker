import { encode } from '../utf8string'
import Schema from '../Schema'
import Type from '../Type'
import ArrayOfBuffers from '../ArrayOfBuffers'
import stopToken from '../stopToken'

export default function writeSchema(schema: Schema, buffers: ArrayOfBuffers) {
	if (typeof schema == 'object') {
		buffers.push(new Uint8Array([Array.isArray(schema) ? Type.Array : Type.Object]))

		for (const key in schema) {
			buffers.push(encode(key))
			buffers.push(stopToken)
			// @ts-ignore (compiler does not understand schema is an object here)
			writeSchema(schema[key], buffers)
		}

		buffers.push(stopToken)  // end of object
	}
	else buffers.push(new Uint8Array([schema]))
}
