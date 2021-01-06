import fs from 'fs'
const { open } = fs.promises

import Type from '../Type.js'
import { encode } from '../utf8string.js'
import { sizeofSchema, writeSchema } from '../schema.js'
import { createAsyncWriterDispatcher } from '../createWriterDispatcher.js'


export default async (value, filepath, schema) => {
	const file = await open(filepath, 'w')
	
	const schemaSize = sizeofSchema(schema)
	const schemaBuffer = new ArrayBuffer(schemaSize)
	writeSchema(schema, schemaBuffer)

	const data = new ArrayBuffer(8)
	const view = new DataView(data)
	const view8 = new Int8Array(data, 0, 1)
	const view32 = new Int8Array(data, 0, 4)
	const view64 = new Int8Array(data, 0, 8)

	const setUint8 = (value) => (view.setUint8(0, value), view8)
	const setInt32 = (value) => (view.setInt32(0, value), view32)
	const setBigInt64 = (value) => (view.setBigInt64(0, value), view64)
	const setFloat64 = (value) => (view.setFloat64(0, value), view64)

	view.setUint32(0, schemaSize)
	await file.write(view32)
	await file.write(new Uint8Array(schemaBuffer))

	const dispatcher = createAsyncWriterDispatcher(schema, {
		[Type.Boolean]: async (value) => await file.write(setUint8(value ? 0 : 1)),
		[Type.Integer]: async (value) => await file.write(setInt32(value)),
		[Type.BigInteger]: async (value) => await file.write(setBigInt64(value)),
		[Type.Number]: async (value) => await file.write(setFloat64(value)),
		[Type.Date]: async (value) => await file.write(setBigInt64(value.getTime())),
		[Type.String]: async (value) => {
			await file.write(encode(value))
			await file.write(setUint8(0))
		},
	})

	await dispatcher(value)
	await file.close()
}
