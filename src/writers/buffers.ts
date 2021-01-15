export function int8(value: number) {
	const buffer = new Uint8Array(1)
	new DataView(buffer.buffer).setInt8(0, value)
	return buffer
}
export function uint8(value: number) {
	const buffer = new Uint8Array(1)
	new DataView(buffer.buffer).setUint8(0, value)
	return buffer
}
export function int16(value: number) {
	const buffer = new Uint8Array(2)
	new DataView(buffer.buffer).setInt16(0, value)
	return buffer
}
export function uint16(value: number) {
	const buffer = new Uint8Array(2)
	new DataView(buffer.buffer).setUint16(0, value)
	return buffer
}
export function int32(value: number) {
	const buffer = new Uint8Array(4)
	new DataView(buffer.buffer).setInt32(0, value)
	return buffer
}
export function uint32(value: number) {
	const buffer = new Uint8Array(4)
	new DataView(buffer.buffer).setUint32(0, value)
	return buffer
}
export function bigInt64(value: bigint) {
	const buffer = new Uint8Array(8)
	new DataView(buffer.buffer).setBigInt64(0, value)
	return buffer
}
export function bigUint64(value: bigint) {
	const buffer = new Uint8Array(8)
	new DataView(buffer.buffer).setBigUint64(0, value)
	return buffer
}
export function float32(value: number) {
	const buffer = new Uint8Array(4)
	new DataView(buffer.buffer).setFloat32(0, value)
	return buffer
}
export function float64(value: number) {
	const buffer = new Uint8Array(8)
	new DataView(buffer.buffer).setFloat64(0, value)
	return buffer
}