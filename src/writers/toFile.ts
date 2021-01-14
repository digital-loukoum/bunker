import toRawData from './toRawData'
import Schema from '../Schema'
import { open } from 'fs/promises'

export default async function toFile(filePath: string, value: any, schema: Schema) {
	const fileOpening = open(filePath, 'w')
	const [rawData] = toRawData(value, schema)
	const file = await fileOpening
	await file.writev(rawData)
	await file.close()
}