
import Type from '../Type.js'
import utf8string from '../utf8string.js'
import { sizeofSchema } from '../schema.js'

export default function toSize(object, schema) {
	let size = sizeofSchema(schema)

	return {
		get result() { return size },
		
		[Type.Boolean]: () => ++size,
		[Type.Integer]: () => size += 4,
		[Type.BigInteger]: () => size += 8,
		[Type.Number]: () => size += 8,
		[Type.Date]: () => size += 8,
		[Type.String]: (value) => size += utf8string(value).length,
		
		// [Type.Object] (object) {
		// 	let sum = 0
		// 	for (let key in this)
		// 		sum += this[key](object[key])
		// 	return sum
		// },
	}
}
