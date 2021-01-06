
import Type from '../Type.js'
import { encode } from '../utf8string.js'
import { createWriterDispatcher } from '../createWriterDispatcher.js'

export default function toSize(value, schema) {
	let size = 0

	const dispatcher = createWriterDispatcher(schema, {
		[Type.Boolean]: () => ++size,
		[Type.Integer]: () => size += 4,
		[Type.BigInteger]: () => size += 8,
		[Type.Number]: () => size += 8,
		[Type.Date]: () => size += 8,
		[Type.String]: (value) => size += encode(value).length + 1,
	})

	dispatcher(value)
	return size
}
