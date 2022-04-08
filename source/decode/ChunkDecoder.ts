import Decoder from "./Decoder.js"
import DataBuffer from "../DataBuffer.js"

/**
 * An abstract class to help decoding data by chunks.
 * The child class only needs to implement the loadNextChunk method.
 */
export default abstract class ChunkDecoder extends Decoder {
	constructor(public chunkSize = 4096) {
		super(new DataBuffer(chunkSize))
	}

	abstract loadNextChunk(): void

	requestBytes(value: number) {
		if (this.cursor + value > this.buffer.byteLength) this.loadNextChunk()
	}

	byte(): number {
		this.requestBytes(1)
		return super.byte()
	}

	bytes(length: number) {
		this.requestBytes(length)
		return super.bytes(length)
	}

	nextByteIs(byte: number): boolean {
		this.requestBytes(1)
		return super.nextByteIs(byte)
	}

	number() {
		this.requestBytes(8)
		return super.number()
	}
}
