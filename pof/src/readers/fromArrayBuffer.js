
import Type from '../Type.js'
import { decode } from '../utf8string.js'
import { readSchema } from '../schema.js'
import createReaderDispatcher from '../createReaderDispatcher.js'

export default function fromArrayBuffer(buffer) {
	const view = new DataView(buffer)
	const uint8Array = new Uint8Array(buffer)
	const schemaSize = view.getUint32(0)
	let offset = schemaSize + 4

	const increment = (value) => {
		const before = offset
		offset += value
		return before
	}
	const incrementBy4 = () => increment(4)
	const incrementBy8 = () => increment(8)

	const schema = readSchema(buffer, 4)

	const dispatcher = createReaderDispatcher(schema, {
		[Type.Boolean]: () => view.getUint8(offset++) ? true : false,
		[Type.Integer]: () => view.getInt32(incrementBy4()),
		[Type.BigInteger]: () => view.setBigInt64(incrementBy8()),
		[Type.Number]: () => view.getFloat64(incrementBy8()),
		[Type.Date]: () => new Date(view.getBigInt64(incrementBy8())),

		[Type.String]: () => {
			const begin = offset
			while (uint8Array[++offset]);
			return decode(uint8Array, begin, offset++)
		},
	})

	return dispatcher()
}
