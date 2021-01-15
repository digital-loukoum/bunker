type TypedArray =
	| Uint8Array | Int8Array
	| Uint16Array | Int16Array
	| Uint32Array | Int32Array
	| BigInt64Array | Float64Array

/**
 * Similar to an array, but automatically update the total byte length
 * when pushing a new buffer
 */
export default class ArrayOfBuffers extends Array<TypedArray> {
	byteLength = 0
	push(arg: TypedArray): number {
		this.byteLength += arg.byteLength
		return super.push(arg)
	}
}
