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
