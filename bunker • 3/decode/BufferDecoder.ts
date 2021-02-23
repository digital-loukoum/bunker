import Decoder from './Decoder'

export default class BufferDecoder extends Decoder {
	buffer = new Uint8Array(this.data.buffer)

	constructor(
		private data: Uint8Array,
		private cursor = 0,
	) { super() }

	reset() {
		this.cursor = 0
	}

	byte(): number {
		return this.buffer[this.cursor++]
	}

	bytes(length: number) {
		const start = this.cursor
		this.cursor += length
		return new Uint8Array(this.buffer, start, length)
	}

	bytesUntil(stopAtByte: number) {
		const start = this.cursor
		while (this.buffer[this.cursor++] != stopAtByte);
		return new Uint8Array(this.buffer, start, this.cursor - start - 1)
	}

	nextByteIs(byte: number): boolean {
		if (this.buffer[this.cursor] == byte) {
			this.cursor++
			return true
		}
		return false
	}

	error(message: string) {
		return new Error(`${message} at position: ${this.cursor - 1}. Byte value: '${this.buffer[this.cursor - 1]}'.`)
	}
}
