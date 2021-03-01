import BufferEncoder from './encode/BufferEncoder'
import BufferDecoder from './decode/BufferDecoder'
import compile from './compile'
import Encoder from './encode/Encoder'

export function bunker(value: any, encoder = new BufferEncoder) {
	return encoder.encode(value)
}
bunker.compile = compile

export function debunker(data: Uint8Array) {
	return new BufferDecoder(data).decode()
}

export function guessSchema(value: any) {
	return Encoder.prototype.dispatcher(value)
}
