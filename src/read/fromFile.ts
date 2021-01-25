import Type from '../Type.js'
import { readFile } from 'fs/promises'
import BufferReader from './BufferReader.js'

export default async function fromFile(file: string) {
	const buffer = await readFile(file)
	const reader = new BufferReader(new Uint8Array(buffer))
	return reader[Type.Any]()
}
