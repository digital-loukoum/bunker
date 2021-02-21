import BufferEncoder from "./encode/BufferEncoder"
import BufferDecoder from "./decode/BufferDecoder"

export function bunker(value: any, encoder = new BufferEncoder) {
	return encoder.encode(value)
}

export function debunker(data: Uint8Array) {
	return new BufferDecoder(data).decode()
}
