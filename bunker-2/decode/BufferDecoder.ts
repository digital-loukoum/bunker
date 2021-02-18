import Decoder from './Decoder'

export default class BufferDecoder extends Decoder {
	view = new DataView(this.data.buffer)

	constructor(
		private data: Uint8Array,
		private cursor = 0,
	) { super() }

	byte(): number {
		return this.view.getUint8(this.cursor++)
	}

	bytes(stopAtByte: number) {
		const start = this.cursor
		while (this.view.getUint8(this.cursor++) != stopAtByte);
		return new Uint8Array(this.data.buffer, start, this.cursor - start - 1)
	}

	nextByteIs(byte: number): boolean {
		if (this.view.getUint8(this.cursor) == byte) {
			this.cursor++
			return true
		}
		return false
	}
}
