import Schema from '../Schema.js'
import writeSchema from './writeSchema.js'
import ArrayOfBuffers from '../ArrayOfBuffers.js'
import guessSchema from '../guessSchema.js'

export default function toSchema(value: any, schema: Schema = guessSchema(value)) {
	const buffers = new ArrayOfBuffers
	writeSchema(schema, buffers)
	return buffers.concatenate()
}
