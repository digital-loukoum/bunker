import { decode } from '../utf8string'
import Type from '../Type'
import Schema from '../Schema'

export default function readSchema(buffer: Uint8Array, offset = 0) {
	const read = () => {
		const type = buffer[offset++]

		if (type >= Type.Object) {  // object or array
			const schema: Schema = {}

			while (buffer[offset]) {
				const begin = offset  // start of key
				while (buffer[++offset]);  // end of key
				const key = +decode(buffer, begin, offset++) as Type
				schema[key] = read()
			}
			
			offset++
			return schema
		}

		return type
	}

	return read()
}