import Type from '../Type.js'
import { encode } from '../utf8string.js'
import { writeSchema, sizeofSchema } from '../schema.js'
import { createWriterDispatcher } from '../createWriterDispatcher.js'

import toSize from './toSize.js'

export default function toArrayBuffer(value, schema) {
	const size = toSize(value, schema)
	const schemaSize = sizeofSchema(schema)

	const buffer = new ArrayBuffer(4 + schemaSize + size)
	const view = new DataView(buffer)
	const uint8view = new Uint8Array(buffer)

	view.setUint32(0, schemaSize)
	let offset = writeSchema(schema, buffer, 4)

	const dispatcher = createWriterDispatcher(schema, {
		[Type.Boolean]: (value) => {
			view.setUint8(offset, value ? 0 : 1)
			offset += 1
		},
		[Type.Integer]: (value) => {
			view.setInt32(offset, value)
			offset += 4
		},
		[Type.BigInteger]: (value) => {
			view.setBigInt64(offset, value)
			offset += 8
		},
		[Type.Number]: (value) => {
			view.setFloat64(offset, value)
			offset += 8
		},
		[Type.Date]: (value) => {
			view.setBigInt64(offset, value.getTime())
			offset += 8
		},
		[Type.String]: (value) => {
			const data = encode(value)
			uint8view.set(data, offset)
			offset += data.length
			view.setUint8(offset++, 0)
		},
	})

	dispatcher(value)
	return buffer
}
