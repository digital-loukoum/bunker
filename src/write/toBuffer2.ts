import Type from '../Type.js'
import Schema from '../Schema.js'
import guessSchema from '../guessSchema.js'
import Writer from './Writer.js'
import createDispatcher from '../createDispatcher.js'
import Encoder from './Encoder'

export default function toRawData3(
	value: any,
	schema: Schema = guessSchema(value)
): Uint8Array {
	const encoder = new Encoder
	encoder.writeSchema(schema)

	const dispatch = createDispatcher(schema, Writer({
		[Type.Null]: () => {},
		[Type.Undefined]: () => {},
		[Type.Any]: (value: any) => toRawData3(value, guessSchema(value)),
		[Type.Boolean]: (value: boolean) => encoder.writeUint8(value ? 1 : 0),
		[Type.Integer]: (value: number) => encoder.writeInt32(value),
		[Type.PositiveInteger]: (value: number) => encoder.writeUint32(value),
		[Type.BigInteger]: (value: bigint) => encoder.writeFloat64(Number(value)),
		[Type.Number]: (value: number) => encoder.writeFloat64(value),
		[Type.Date]: (value: Date) => encoder.writeFloat64(value.getTime()),
		[Type.String]: (value: string) => {
			encoder.writeString(value)
			encoder.writeUint8(0)
		},
		[Type.RegExp]: (value: RegExp) => {
			encoder.writeString(value.source)
			encoder.writeUint8(0)
			encoder.writeString(value.flags)
			encoder.writeUint8(0)
		}
	}))

	dispatch(value)
	return encoder.data
}
