import Type from './Type'
import Schema, { guessSchema } from './Schema'
import toRawData from './writers/toRawData'
import toFile from './writers/toFile'
import toBuffer from './writers/toBuffer'
import fromBuffer from './readers/fromBuffer'

export { Type as BunkerType, Schema, guessSchema }

export function bunker(value: any, schema: Schema = guessSchema(value)) {
	return toBuffer(value, schema)
}

export function debunker(buffer: Uint8Array) {
	return fromBuffer(buffer)
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
