import Type from '../Type.js'
import Schema from '../Schema.js'
import guessSchema from '../guessSchema.js'
import BufferWriter from './BufferWriter.js'

export default function toBuffer(value: any, schema: 'lazy' | Schema = guessSchema(value)): Uint8Array {
	const writer = new BufferWriter
	if (schema == 'lazy')
		schema = guessSchema(value, true)
	writer[Type.Any](value, schema)
	return writer.data
}
