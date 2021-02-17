import Encoder from './Encoder'

export default class BufferEncoder extends Encoder {
	size = 0
	prefixSize = 0

	constructor(
		public capacity = 64,
		public buffer = new Uint8Array(capacity),
		public view = new DataView(buffer.buffer),
	) { super() }

	get data() {
		return new Uint8Array(this.buffer.buffer, 0, this.size)
	}

	reset() {
		super.reset()
		this.size = this.prefixSize
	}

	prefix(bytes = new Uint8Array) {
		this.bytes(bytes)
		this.size = this.prefixSize = bytes.byteLength
	}

	lockAsPrefix() {
		this.prefixSize = this.size
	}

	incrementSizeBy(value: number) {
		const requiredSize = this.size + value
		if (this.capacity < requiredSize)
			this.onCapacityOverflow(requiredSize)
	}
  
	onCapacityOverflow(newSize: number) {
		if (this.capacity == 64)
			this.capacity = 4096
		while (this.capacity < newSize)
			this.capacity *= 2
		const newBuffer = new ArrayBuffer(this.capacity)
		const newBytes = new Uint8Array(newBuffer)
		const newView = new DataView(newBuffer)
		newBytes.set(this.buffer)
		this.view = newView
		this.buffer = newBytes
	}

	// write a single byte
	byte(value: number) {
		this.incrementSizeBy(1)
		this.view.setUint8(this.size++, value)
	}

	// write an array of bytes
	bytes(value: Uint8Array) {
		this.incrementSizeBy(value.byteLength)
		this.buffer.set(value, this.size)
		this.size += value.byteLength
	}
}
