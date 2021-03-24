import Decoder from "./Decoder"

/**
 * An abstract class to help decoding data by chunks.
 * The child class only needs to implement the loadNextChunk method.
 */
export default abstract class ChunkDecoder extends Decoder {
	constructor(public chunkSize = 4096) {
		super()
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

	integer32() {
		this.requestBytes(4)
		return super.integer32()
	}

	number32() {
		this.requestBytes(4)
		return super.number32()
	}

	number64() {
		this.requestBytes(8)
		return super.number64()
	}
}
