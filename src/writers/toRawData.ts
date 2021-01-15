import Type from '../Type'
import Schema from '../Schema'
import { encode } from '../utf8string'
import writeSchema from './writeSchema'
import createDispatcher from './createDispatcher'
import ArrayOfBuffers from '../ArrayOfBuffers'
import stopToken from '../stopToken'

export default function toRawData(value: any, schema: Schema): ArrayOfBuffers {
	const buffers = new ArrayOfBuffers
	buffers.push(new Uint32Array([0]))
	writeSchema(schema, buffers)
	buffers[0] = new Uint32Array([buffers.byteLength])

	const dispatch = createDispatcher(schema, {
		[Type.Boolean]: (value) => buffers.push(new Uint8Array([value ? 0 : 1])),
		[Type.Integer]: (value) => buffers.push(new Int32Array([value])),
		[Type.BigInteger]: (value) => buffers.push(new BigInt64Array([value])),
		[Type.Number]: (value) => buffers.push(new Float64Array([value])),
		[Type.Date]: (value) => buffers.push(new BigInt64Array([BigInt(value.getTime())])),
		[Type.String]: (value) => {
			buffers.push(encode(value))
			buffers.push(stopToken)
		},
		[Type.Array]: (value) => buffers.push(new Uint32Array([value.length])),  // the length of the array
	})

	dispatch(value)
	return buffers
}
