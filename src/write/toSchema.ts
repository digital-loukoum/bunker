import guessSchema from '../guessSchema.js'
import BufferWriter from './BufferWriter.js'

export default function toSchema(value: any, schema = guessSchema(value)): Uint8Array {
	const writer = new BufferWriter
	writer.writeSchema(schema)
	return writer.data
}
