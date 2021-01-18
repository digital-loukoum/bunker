import Type from '../Type'
import Schema from '../Schema'
import guessSchema from '../guessSchema'
import { encode } from '../utf8string'
import writeSchema from './writeSchema'
import Writer from './Writer'
import createDispatcher from '../createDispatcher'
import ArrayOfBuffers from '../ArrayOfBuffers'
import stopToken from '../stopToken'
import { uint8, int32, uint32, float64, bigInt64 } from '../buffers'

export default function toRawData(
	value: any,
	schema: Schema = guessSchema(value),
	buffers = new ArrayOfBuffers
): ArrayOfBuffers {
	writeSchema(schema, buffers)

	const dispatch = createDispatcher(schema, new class extends Writer {
		[Type.Null] = () => {};
		[Type.Undefined] = () => {};
		[Type.Any] = (value: any) => toRawData(value, guessSchema(value), buffers);
		[Type.Boolean] = (value: boolean) => buffers.push(uint8(value ? 1 : 0));
		[Type.Integer] = (value: number) => buffers.push(int32(value));
		[Type.PositiveInteger] = (value: number) => buffers.push(uint32(value));
		[Type.BigInteger] = (value: bigint) => buffers.push(bigInt64(value));
		[Type.Number] = (value: number) => buffers.push(float64(value));
		[Type.Date] = (value: Date) => buffers.push(bigInt64(BigInt(value.getTime())));
		[Type.String] = (value: string) => {
			buffers.push(encode(value))
			buffers.push(stopToken)
		}
		[Type.RegExp] = (value: RegExp) => {
			buffers.push(encode(value.source))
			buffers.push(stopToken)
			buffers.push(encode(value.flags))
			buffers.push(stopToken)
		}
	})

	dispatch(value)
	return buffers
}
