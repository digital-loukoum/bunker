import BufferEncoder from "./encode/BufferEncoder";

export function bunker(value: any, encoder = new BufferEncoder) {
	return encoder.encode(value)
}
