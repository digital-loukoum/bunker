import toRawData from './toRawData'
import Schema from '../Schema'

export default function toBuffer(value: any, schema: Schema) {
	const rawData = toRawData(value, schema)
	const buffer = new Uint8Array(rawData.byteLength)
	let offset = 0
	rawData.forEach(array => {
		buffer.set(array, offset)
		offset += array.length
	})
	return buffer
}
