import Decoder from './Decoder'

export default class BufferDecoder extends Decoder {
	constructor(
		public data: Uint8Array,
		public cursor = 0
	) {
		super()
	}

	decode() {
		this.cursor = 0
		super.decode()
	}

	byte(): number {
		return this.data[this.cursor++]
	}

	bytes(length: number) {
		const start = this.cursor
		this.cursor += length
		return new Uint8Array(this.data, start, length)
	}

	bytesUntil(stopAtByte: number) {
		const start = this.cursor
		while (this.data[this.cursor++] != stopAtByte);
		return new Uint8Array(this.data, start, this.cursor - start - 1)
	}

	nextByteIs(byte: number): boolean {
		if (this.data[this.cursor] == byte) {
			this.cursor++
			return true
		}
		return false
	}

	error(message: string) {
		return new Error(`${message} at position: ${this.cursor - 1}. Byte value: '${this.data[this.cursor - 1]}'.`)
	}
}
