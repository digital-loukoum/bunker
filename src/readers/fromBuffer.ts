import Type from '../Type'
import { decode } from '../utf8string'
import readSchema from './readSchema'
import createDispatcher from './createDispatcher'

export default function fromBuffer(buffer: Uint8Array): unknown {
	const view = new DataView(buffer.buffer)
	let [schema, offset] = readSchema(buffer)
	console.log("schema", schema)

	const shift = (value: number) => {
		console.log('offset:', offset, 'incrementBy:', value)
		const before = offset
		offset += value
		return before
	}

	const dispatch = createDispatcher(schema, {
		[Type.Boolean]: () => view.getUint8(offset++) ? true : false,
		[Type.Integer]: () => view.getInt32(shift(4)),
		[Type.BigInteger]: () => view.getBigInt64(shift(8)),
		[Type.Number]: () => view.getFloat64(shift(8)),
		[Type.Date]: () => new Date(Number(view.getBigInt64(shift(8)))),
		[Type.String]: () => {
			const begin = offset
			while (buffer[++offset]);
			return decode(buffer, begin, offset++)
		},
		[Type.Array]: () => {
			const length = view.getUint32(shift(4))
			console.log('Found array with length:', length)
			return length
		}
	})

	return dispatch()
}
