import BufferEncoder from './encode/BufferEncoder'
import Schema from './schema/index'

export function bunker(value: any, schema?: Schema) {
	if (schema) return bunker.withSchema(schema)(value)
	return bunker.guessSchema(value)(value)
}

bunker.withSchema = (schema: Schema) => {
	const encoder = new BufferEncoder
	const [encodedSchema, dispatch] = withSchema(schema, encoder)
	return (value: any) => {
		encoder.reset()
		encoder.bytes(encodedSchema)
		return dispatch(value)
	}
}

bunker.guessSchema = (value: any) => {
	const encoder = new BufferEncoder
	const [encodedSchema, dispatch] = guessSchema(value, encoder)
	return (valueToEncode: any) => {
		encoder.reset()
		encoder.bytes(encodedSchema)
		return dispatch(valueToEncode)
	}
}
