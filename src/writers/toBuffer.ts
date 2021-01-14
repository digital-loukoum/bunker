import toRawData from './toRawData'
import Schema from '../Schema'

export default function toBuffer(value: any, schema: Schema) {
	const [rawData, size] = toRawData(value, schema)
	const buffer = new Uint8Array(size)
	let offset = 0
	rawData.forEach(array => {
		// @ts-ignore
		buffer.set(array, offset)
		offset += array.buffer.byteLength
	})
	return buffer
}
