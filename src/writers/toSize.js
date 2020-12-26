
import Type from '../Type.js'
import { encode } from '../utf8string.js'

export default function toSize() {
	let size = 0

	return {
		get result() { return size },
		
		[Type.Boolean]: () => ++size,
		[Type.Integer]: () => size += 4,
		[Type.BigInteger]: () => size += 8,
		[Type.Number]: () => size += 8,
		[Type.Date]: () => size += 8,
		[Type.String]: (value) => size += encode(value).length,
	}
}
