import Encoder from './encode/Encoder'
import BufferEncoder from './encode/BufferEncoder'
import Schema from './schema/Schema'
import guessSchema from './schema/guessSchema'

export function bunker(value: any, schema = guessSchema(value)) {
	return bunker.compile(schema)(value)
}

bunker.compile = (schema: Schema, encoder: Encoder = new BufferEncoder) => {
	const dispatch = compileSchema(schema, encoder)
	return (value: any) => {
		encoder.reset()
		dispatch(value)
		return encoder.data
	}
}
