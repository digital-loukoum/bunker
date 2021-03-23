import BufferEncoder from './encode/BufferEncoder'
import BufferDecoder from './decode/BufferDecoder'
import compile from './compile'
import Encoder, { Dispatcher as Schema } from './encode/Encoder'
export { Schema }

export function bunker(value: any, schema?: Schema, encoder = new BufferEncoder) {
	if (!schema) schema = encoder.dispatcher(value)
	return encoder.encode(value, schema)
}
bunker.compile = compile

export function debunker(data: Uint8Array) {
	return new BufferDecoder(data).decode()
}

export function guessSchema(value: any) {
	return Encoder.prototype.dispatcher(value)
}

// we export the schema constructors
export const {
	character,
	binary,
	boolean,
	positiveInteger,
	integer32,
	integer64,
	integer,
	bigInteger,
	number32,
	number64,
	number,
	string,
	regularExpression,
	date,
	any,
	nullable,
	tuple,
	object,
	array,
	set,
	record,
	map
} = Encoder.prototype
bunker.character = character
bunker.binary = binary
bunker.boolean = boolean
bunker.positiveInteger = positiveInteger
bunker.integer32 = integer32
bunker.integer64 = integer64
bunker.integer = integer
bunker.bigInteger = bigInteger
bunker.number32 = number32
bunker.number64 = number64
bunker.number = number
bunker.string = string
bunker.regularExpression = regularExpression
bunker.date = date
bunker.any = any
bunker.nullable = nullable
bunker.tuple = tuple
bunker.object = object
bunker.array = array
bunker.set = set
bunker.record = record
bunker.map = map
