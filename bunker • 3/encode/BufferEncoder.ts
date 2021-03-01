import Encoder from './Encoder'

export default class BufferEncoder extends Encoder {
	size = 0

	constructor(
		public capacity = 64,
		public buffer = new Uint8Array(capacity)
	) { super() }

	get data() {
		return new Uint8Array(this.buffer.buffer, 0, this.size)
	}

	reset() {
		super.reset()
		this.size = 0
	}

	byte(value: number) {  // write a single byte
		this.incrementSizeBy(1)
		this.buffer[this.size++] = value
	}
	
	bytes(value: Uint8Array) {  // write an array of bytes
		this.incrementSizeBy(value.byteLength)
		this.buffer.set(value, this.size)
		this.size += value.byteLength
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
		newBytes.set(this.buffer)
		this.buffer = newBytes
	}
}