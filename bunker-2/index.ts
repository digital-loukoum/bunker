import Encoder from './encode/Encoder'
import BufferEncoder from './encode/BufferEncoder'
import BufferDecoder from './decode/BufferDecoder'
import Schema, { schemaBuilder, createSchema } from './schema/Schema'
import guessSchema from './schema/guessSchema'

export { Schema, guessSchema, schemaBuilder as Type, createSchema }

export function bunker(value: any, schema = guessSchema(value)) {
	const encoder = new BufferEncoder
	encoder.compile(schema)(value)
	return encoder.data
}

bunker.compile = (schema: Schema, encoder: Encoder = new BufferEncoder) => {
	const dispatch = encoder.compile(schema)
	encoder.lockAsPrefix()
	return (value: any) => {
		encoder.reset()
		dispatch(value)
		return encoder.data
	}
}

export function debunker(data: Uint8Array) {
	return new BufferDecoder(data).compile()()
}

// for handmade schema
