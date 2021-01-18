
/**
 * Similar to an array, but automatically update the total byte length
 * when pushing a new buffer
 */
export default class ArrayOfBuffers extends Array<Uint8Array> {
	byteLength = 0

	push(arg: Uint8Array): number {
		this.byteLength += arg.byteLength
		return super.push(arg)
	}

	concatenate() {
		const buffer = new Uint8Array(this.byteLength)
		let offset = 0
		this.forEach(array => {
			buffer.set(array, offset)
			offset += array.length
		})
		return buffer
	}
}
