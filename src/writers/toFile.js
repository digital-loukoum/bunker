
import Type from '../Type.js'
import { encode } from '../utf8string.js'

import toSize from './toSize.js'
import resolve from '../resolveWriter.js'
import { writeSchema } from '../schema.js'


export default (file) => (object, schema) => {
	const size = resolve(object, schema, toSize)
	const buffer = new ArrayBuffer(size)
	let offset = writeSchema(schema, buffer)

	return {
		result: buffer,

		[Type.Boolean]: (value) => {
			new DataView(buffer).setUint8(offset, value ? 0 : 1)
			offset += 1
		},

		[Type.Integer]: (value) => {
			new DataView(buffer).setInt32(offset, value)
			offset += 4
		},

		[Type.BigInteger]: (value) => {
			new DataView(buffer).setBigInt64(offset, value)
			offset += 8
		},

		[Type.Number]: (value) => {
			new DataView(buffer).setFloat64(offset, value)
			offset += 8
		},

		[Type.Date]: (value) => {
			new DataView(buffer).setBigInt64(offset, value.getTime())
			offset += 8
		},

		[Type.String]: (value) => {
			const data = encode(value)
			new Uint8Array(buffer, offset).set(data)
			offset += data.length
		},
	}
}
