import Encoder from './encode/Encoder'
import BufferEncoder from './encode/BufferEncoder'
import Schema from './schema/Schema'
import guessSchema from './schema/guessSchema'

export { Schema, guessSchema }

export function bunker(value: any, schema = guessSchema(value)) {
	return bunker.compile(schema)(value)
}

bunker.compile = (schema: Schema, encoder: Encoder = new BufferEncoder) => {
	const dispatch = encoder.compile(schema)
	encoder.lockAsPrefix()
	return (value: any) => {
		encoder.reset()
		dispatch(value)
		return encoder.data
	}
}
