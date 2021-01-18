import readSchema from './readSchema'

export default function fromSchema(buffer: Uint8Array, offset = 0) {
	return readSchema(buffer, offset)[0]
}