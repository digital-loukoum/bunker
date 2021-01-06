import fs from 'fs'
const { open } = fs.promises

import Type from '../Type.js'
import { encode } from '../utf8string.js'
import { sizeofSchema, writeSchema } from '../schema.js'
import { createWriterDispatcher } from '../createWriterDispatcher.js'


export default async (value, stream, schema) => {
	const schemaSize = sizeofSchema(schema)
	const schemaBuffer = new ArrayBuffer(schemaSize)
	writeSchema(schema, schemaBuffer)

	const data = new ArrayBuffer(8)
	const view = new DataView(data)
	const view8 = new Uint8Array(data, 0, 1)
	const view32 = new Uint8Array(data, 0, 4)
	const view64 = new Uint8Array(data, 0, 8)

	const setUint8 = (value) => (view.setUint8(0, value), view8)
	const setInt32 = (value) => (view.setInt32(0, value), view32)
	const setBigInt64 = (value) => (view.setBigInt64(0, value), view64)
	const setFloat64 = (value) => (view.setFloat64(0, value), view64)

	view.setUint32(0, schemaSize)
	stream.write(view32)
	stream.write(new Uint8Array(schemaBuffer))

	const dispatcher = createWriterDispatcher(schema, {
		[Type.Boolean]: (value) => stream.write(setUint8(value ? 0 : 1)),
		[Type.Integer]: (value) => stream.write(setInt32(value)),
		[Type.BigInteger]: (value) => stream.write(setBigInt64(value)),
		[Type.Number]: (value) => stream.write(setFloat64(value)),
		[Type.Date]: (value) => stream.write(setBigInt64(value.getTime())),
		[Type.String]: (value) => {
			stream.write(encode(value))
			stream.write(setUint8(0))
		},
	})

	dispatcher(value)
}
