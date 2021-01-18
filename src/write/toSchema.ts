import Schema from '../Schema.js'
import writeSchema from './writeSchema.js'
import ArrayOfBuffers from '../ArrayOfBuffers.js'

export default function toSchema(schema: Schema) {
	const buffers = new ArrayOfBuffers
	writeSchema(schema, buffers)
	return buffers.concatenate()
}
