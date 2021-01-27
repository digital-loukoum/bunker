import Type from '../Type.js'
import { writeFile } from 'fs/promises'
import guessSchema from '../guessSchema.js'
import BufferWriter from './BufferWriter.js'

export default async function toFile(file: string, value: any, schema = guessSchema(value)) {
	const writer = new BufferWriter
	writer[Type.Any](value, schema)
	await writeFile(file, writer.data)
}
