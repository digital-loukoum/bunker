import { encode } from '../utf8string'
import Schema from '../Schema'
import Type from '../Type'

export default function writeSchema(schema: Schema, buffer: Uint8Array, offset = 0) {

	const write = (type: Schema) => {
		if (typeof type == 'object') {
			buffer[offset++] = Array.isArray(type) ? Type.Array : Type.Object

			for (const key in type) {
				const keyData = encode(key)
				buffer.set(keyData, offset)
				offset += keyData.length
				buffer[offset++] = 0  // end of key
				write(type[key])
			}

			buffer[offset++] = 0  // end of object
		}
		else buffer[offset++] = type
	}
	
	write(schema)
	return offset
}
