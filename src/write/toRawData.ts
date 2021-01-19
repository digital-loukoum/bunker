import Type from '../Type.js'
import Schema from '../Schema.js'
import guessSchema from '../guessSchema.js'
import { encode } from '../utf8string.js'
import writeSchema from './writeSchema.js'
import Writer from './Writer.js'
import createDispatcher from '../createDispatcher.js'
import ArrayOfBuffers from '../ArrayOfBuffers.js'
import stopToken from '../stopToken.js'
import { uint8, int32, uint32, float64, bigInt64 } from '../buffers.js'

export default function toRawData(
	value: any,
	schema: Schema = guessSchema(value),
	buffers = new ArrayOfBuffers
): ArrayOfBuffers {
	writeSchema(schema, buffers)

	const dispatch = createDispatcher(schema, Writer({
		[Type.Null]: () => {},
		[Type.Undefined]: () => {},
		[Type.Any]: (value: any) => toRawData(value, guessSchema(value), buffers),
		[Type.Boolean]: (value: boolean) => buffers.push(uint8(value ? 1 : 0)),
		[Type.Integer]: (value: number) => buffers.push(int32(value)),
		[Type.PositiveInteger]: (value: number) => buffers.push(uint32(value)),
		[Type.BigInteger]: (value: bigint) => buffers.push(bigInt64(value)),
		[Type.Number]: (value: number) => buffers.push(float64(value)),
		[Type.Date]: (value: Date) => buffers.push(bigInt64(BigInt(value.getTime()))),
		[Type.String]: (value: string) => {
			buffers.push(encode(value))
			buffers.push(stopToken)
		},
		[Type.RegExp]: (value: RegExp) => {
			buffers.push(encode(value.source))
			buffers.push(stopToken)
			buffers.push(encode(value.flags))
			buffers.push(stopToken)
		}
	}))

	dispatch(value)
	return buffers
}
