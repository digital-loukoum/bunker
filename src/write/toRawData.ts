import Type from '../Type'
import Schema, { guessSchema } from '../Schema'
import { encode } from '../utf8string'
import writeSchema from './writeSchema'
import createDispatcher from './createDispatcher'
import ArrayOfBuffers from './ArrayOfBuffers'
import stopToken from '../stopToken'
import { uint8, int32, uint32, float64, bigInt64 } from './buffers'

export default function toRawData(value: any, schema: Schema, buffers = new ArrayOfBuffers): ArrayOfBuffers {
	writeSchema(schema, buffers)

	const dispatch = createDispatcher(schema, {
		[Type.Null]: () => {},
		[Type.Undefined]: () => {},
		[Type.Any]: value => toRawData(value, guessSchema(value), buffers),
		[Type.Boolean]: value => buffers.push(uint8(value ? 1 : 0)),
		[Type.Integer]: value => buffers.push(int32(value)),
		[Type.BigInteger]: value => buffers.push(bigInt64(value)),
		[Type.Number]: value => buffers.push(float64(value)),
		[Type.Date]: value => buffers.push(bigInt64(BigInt(value.getTime()))),
		[Type.String]: value => {
			buffers.push(encode(value))
			buffers.push(stopToken)
		},
		[Type.Array]: value => buffers.push(uint32(value.length)),  // the length of the array
	})

	dispatch(value)
	return buffers
}
