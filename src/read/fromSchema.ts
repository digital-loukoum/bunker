import BufferReader from './BufferReader'

export default function fromBuffer(buffer: Uint8Array, offset = 0): unknown {
	return new BufferReader(buffer, offset).readSchema()
}
