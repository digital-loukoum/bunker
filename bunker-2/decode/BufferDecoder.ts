import Decoder from './Decoder'

export default class BufferDecoder extends Decoder {
	view = new DataView(this.data.buffer)

	constructor(
		private data: Uint8Array,
		private cursor = 0,
	) { super() }

	decode() {
		this.cursor = 0
		return this.compile()()
	}

	byte(): number {
		return this.view.getUint8(this.cursor++)
	}

	bytes(stopAtByte: number) {
		const start = this.cursor
		while (this.view.getUint8(this.cursor) != stopAtByte) this.cursor++
		return new Uint8Array(this.data.buffer, start, this.cursor)
	}

	nextByteIs(byte: number): boolean {
		if (this.view.getUint8(this.cursor) == byte) {
			this.cursor++
			return true
		}
		return false
	}
}