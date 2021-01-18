import readSchema from './readSchema.js'

export default function fromSchema(buffer: Uint8Array, offset = 0) {
	return readSchema(buffer, offset)[0]
}