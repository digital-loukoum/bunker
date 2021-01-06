import Type from '../Type.js'
import { encode } from '../utf8string.js'
import { writeSchema, sizeofSchema } from '../schema.js'
import { createWriterDispatcher } from '../createWriterDispatcher.js'

export default function toArrayBuffer(value, schema) {
	const schemaSize = sizeofSchema(schema)
	const schemaBuffer = new Uint8Array(schemaSize)
	writeSchema(schema, schemaBuffer.buffer)

	const buffers = [new Uint32Array([schemaSize]), schemaBuffer]

	const dispatcher = createWriterDispatcher(schema, {
		[Type.Boolean]: (value) => buffers.push(new Uint8Array([value ? 0 : 1])),
		[Type.Integer]: (value) => buffers.push(new Int32Array([value])),
		[Type.BigInteger]: (value) => buffers.push(new BigInt64Array([value])),
		[Type.Number]: (value) => buffers.push(new Float64Array([value])),
		[Type.Date]: (value) => buffers.push(new BigInt64Array([value.getTime()])),
		[Type.String]: (value) => {
			buffers.push(encode(value))
			buffers.push(new Uint8Array([0]))
		},
	})

	dispatcher(value)
	return buffers
}
