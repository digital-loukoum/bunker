import Type from './Type'
import Schema from './Schema'
import toRawData from './write/toRawData'
import toFile from './write/toFile'
import toBuffer from './write/toBuffer'
// import fromBuffer from './read/fromBuffer'
import guessSchema from './guessSchema'

export { Type as BunkerType, Schema, guessSchema }

export function bunker(value: any, schema: Schema = guessSchema(value)) {
	return toBuffer(value, schema)
}

export function debunker(buffer: Uint8Array) {
	// return fromBuffer(buffer)
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
