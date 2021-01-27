import Schema from '../Schema.js'
import guessSchema from '../guessSchema.js'
import FileWriter from './FileWriter.js'

export default async function toFile(file: string, value: any, schema = guessSchema(value)) {
	return await new FileWriter(file).write(value, schema)
}
