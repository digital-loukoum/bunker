import Type from '../Type'
import Schema from '../Schema'
import { encode } from '../utf8string'
import writeSchema from '../schema/writeSchema'
import sizeofSchema from '../schema/sizeofSchema'
import createDispatcher from './createDispatcher'

type TypedArray =
	| Uint8Array | Int8Array
	| Uint16Array | Int16Array
	| Uint32Array | Int32Array
	| BigInt64Array | Float64Array

const endOfString = new Uint8Array([0])

export default function toRawData(value: any, schema: Schema): [Array<TypedArray>, number] {
	const schemaSize = sizeofSchema(schema)
	const schemaBuffer = new Uint8Array(schemaSize)
	let size = schemaSize + 4
	writeSchema(schema, schemaBuffer)

	const buffers: Array<TypedArray> = [new Uint32Array([schemaSize]), schemaBuffer]

	const dispatch = createDispatcher(schema, {
		[Type.Boolean]: (value) => {
			buffers.push(new Uint8Array([value ? 0 : 1]))
			size += 1
		},
		[Type.Integer]: (value) => {
			buffers.push(new Int32Array([value]))
			size += 4
		},
		[Type.BigInteger]: (value) => {
			buffers.push(new BigInt64Array([value]))
			size += 8
		},
		[Type.Number]: (value) => {
			buffers.push(new Float64Array([value]))
			size += 8
		},
		[Type.Date]: (value) => {
			buffers.push(new BigInt64Array([BigInt(value.getTime())]))
			size += 8
		},
		[Type.String]: (value) => {
			const buffer = encode(value)
			buffers.push(buffer, endOfString)
			size += buffer.byteLength
		},
		[Type.Array]: (value) => {
			buffers.push(new Uint32Array([value.length]))  // the length of the array
			size += 4
		}
	})

	dispatch(value)
	return [ buffers, size ]
}
