import { decode } from '../utf8string'
import Type from '../Type'
import Schema from '../Schema'

export default function readSchema(buffer: Uint8Array, offset = 0): [Schema, number] {
	const type = buffer[offset++]

	if (type == Type.Array) {
		let elementsSchema, propertiesSchema
		;[elementsSchema, offset] = readSchema(buffer, offset)
		;[propertiesSchema, offset] = readSchema(buffer, offset)
		return [[elementsSchema, propertiesSchema] as Schema, offset]
	}
	else if (type == Type.Object) {  // object or array
		const schema: Schema = {}

		while (buffer[offset]) {
			const begin = offset  // start of key
			while (buffer[++offset]);  // end of key
			const key = decode(buffer, begin, offset++)
			// @ts-ignore
			;[schema[key], offset] = readSchema(buffer, offset)
		}
		
		return [schema, offset + 1]
	}

	return [type, offset]
}