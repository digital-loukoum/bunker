import Decoder from './Decoder'
import DataBuffer from '../DataBuffer'

export default class BufferDecoder extends Decoder {
	constructor(data: Uint8Array | Buffer, cursor = 0) {
		super(DataBuffer.new(data), cursor)
	}
}
