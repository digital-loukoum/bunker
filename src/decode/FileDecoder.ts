import Decoder from "./Decoder"
// import DataBuffer from '../DataBuffer'

export default class BufferDecoder extends Decoder {
	constructor(public filename: string, public chunkSize = 4096) {
		super()
	}

	requestBytes(value: number) {
		const requiredSize = this.cursor + value
		if (requiredSize > this.buffer.byteLength) this.loadData(requiredSize)
	}

	loadData(requiredSize: number) {
		console.log("loadData", requiredSize)
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
