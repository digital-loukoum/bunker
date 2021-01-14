import Type from './Type'
import Schema from './Schema'
import guessSchema from './schema/guessSchema'
import toRawData from './writers/toRawData'
import toFile from './writers/toFile'

export { Type as BunkerType, Schema, guessSchema }

export function bunker() {

}

export function debunker() {

}

export async function bunkerFile(file: string, value: any, schema: Schema = guessSchema(value)) {
	toFile(file, value, schema)
}

export function debunkerFile() {

}

export function bunkerRawData(value: any, schema: Schema = guessSchema(value)) {
	return toRawData(value, schema)
}

export function debunkerRawData() {

}
