import toRawData from './toRawData.js'
import Schema from '../Schema.js'
import guessSchema from '../guessSchema.js'

export default function toBuffer(value: any, schema: Schema = guessSchema(value)) {
	return toRawData(value, schema).concatenate()
}
