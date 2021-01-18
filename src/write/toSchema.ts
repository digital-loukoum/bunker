import Schema from '../Schema'
import writeSchema from './writeSchema'
import ArrayOfBuffers from '../ArrayOfBuffers'
import guessSchema from '../guessSchema'

export default function toSchema(value: any, schema: Schema = guessSchema(value)) {
	const buffers = new ArrayOfBuffers
	writeSchema(schema, buffers)
	return buffers.concatenate()
}
