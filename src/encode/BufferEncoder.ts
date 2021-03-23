import Encoder from "./Encoder"
import DataBuffer from "../DataBuffer"

export default class BufferEncoder extends Encoder {
	onCapacityFull(demandedSize: number) {
		if (this.capacity == 64) this.capacity = 4096
		while (this.capacity < demandedSize) this.capacity *= 2
		const newBuffer = new DataBuffer(this.capacity)
		newBuffer.set(this.buffer)
		this.buffer = newBuffer
	}
}
