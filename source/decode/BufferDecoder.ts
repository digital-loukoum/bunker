import Decoder from "./Decoder.js"
import DataBuffer from "../DataBuffer.js"

export default class BufferDecoder extends Decoder {
	constructor(data: Uint8Array | Buffer, cursor = 0) {
		super(new DataBuffer(data), cursor)
	}
}
