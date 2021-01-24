import Type from '../Type'
import BufferReader from './BufferReader'

export default function fromBuffer(buffer: Uint8Array, offset = 0): unknown {
	const reader = new BufferReader(buffer, offset)
	return reader[Type.Any]()
}
