import Schema from '../Schema.js'
import guessSchema from '../guessSchema.js'
import FileWriter from './FileWriter.js'

export default async function toFile(file: string, value: any, schema: 'lazy' | Schema = guessSchema(value)) {
	if (schema == 'lazy') schema = guessSchema(value, true)
	return await new FileWriter(file).write(value, schema)
}
