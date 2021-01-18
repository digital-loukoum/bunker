import { decode } from '../utf8string'
import Type from '../Type'
import Schema, { ObjectRecord, MapRecord } from '../Schema'

export default function readSchema(buffer: Uint8Array, offset = 0): [Schema, number] {

	const read = (): Schema => {
		const type = buffer[offset++]

		switch (type) {
			case Type.Object: {
				const schema: Schema = {}
				while (buffer[offset]) {
					const begin = offset  // start of key
					while (buffer[++offset]);  // end of key
					const key = decode(buffer, begin, offset++)
					schema[key] = read()
				}
				offset++
				return schema
			}
	
			case Type.ObjectRecord:
				return new ObjectRecord(read())

			case Type.Array:
				return [read(), read()] as Schema

			case Type.Set:
				return new Set([read()])

			case Type.Map: {
				const schema = new Map
				while (buffer[offset]) {
					const begin = offset  // start of key
					while (buffer[++offset]);  // end of key
					const key = decode(buffer, begin, offset++)
					schema.set(key, read())
				}
				offset++
				return schema
			}

			case Type.MapRecord:
				return new MapRecord(read())
		}
		
		return type
	}

	return [read(), offset]
}