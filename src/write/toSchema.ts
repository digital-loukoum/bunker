import Schema from '../Schema'
import guessSchema from '../guessSchema.js'
import BufferWriter from './BufferWriter.js'

export default function toSchema(value: any, schema: 'lazy' | Schema = guessSchema(value)): Uint8Array {
	if (schema == 'lazy') schema = guessSchema(value, true)
	const writer = new BufferWriter
	writer.writeSchema(schema)
	return writer.data
}
