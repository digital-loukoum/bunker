import Type from '../Type.js'
import Schema from '../Schema.js'
import { writeFile } from 'fs/promises'
import guessSchema from '../guessSchema.js'
import BufferWriter from './BufferWriter.js'

export default async function toFile(file: string, value: any, schema: 'lazy' | Schema = guessSchema(value)) {
	if (schema == 'lazy')
		schema = guessSchema(value, true)
	const writer = new BufferWriter
	writer[Type.Any](value, schema)
	await writeFile(file, writer.data)
}
