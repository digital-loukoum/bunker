/**
 * A DataBuffer is an Uint8Array with an integrated DataView
 */
export default class DataBuffer extends Uint8Array {
	public view!: DataView

	constructor(lengthOrUint8Array: number | Uint8Array = 0) {
		super(lengthOrUint8Array as any)
		this.view = new DataView(this.buffer)
	}

	slice(begin = 0, end = this.byteLength) {
		const slice: DataBuffer = new Uint8Array(this.buffer, begin, end - begin) as any
		// @ts-ignore [this way of extending Buffer cannot be understood by TS compiler]
		slice.__proto__ = DataBuffer.prototype
		slice.view = new DataView(this.buffer, begin, end - begin)
		return slice
	}
}
