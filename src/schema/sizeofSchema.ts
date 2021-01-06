import { encode } from '../utf8string'
import Schema from '../Schema'

export default function sizeofSchema(schema: Schema) {
	let sum = 1
	if (typeof schema == 'object') {
		for (let key in schema)
			sum += encode(key).length + 1 + sizeofSchema(schema[key])
		sum++  // end of object character
	}
	return sum
}
