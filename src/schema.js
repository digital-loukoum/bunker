
import Type from './Type.js'

const bunkerType = {
	number: (number) => Number.isInteger(number) ? Type.Integer : Type.Number,
	bigint: () => Type.BigInteger,
	string: () => Type.String,
	boolean: () => Type.Boolean,
	object: (object) => {
		let schema
		if (!object) return undefined
		if (object instanceof Date) return Type.Date

		if (Array.isArray(object))
			schema = [schemaOf(object[0])]
		else schema = {}

		for (let key in object)
			if (object[key] !== undefined && typeof object[key] != 'function')
				schema[key] = schemaOf(object[key])

		return schema
	},
	undefined: () => undefined,
	function: () => undefined,
}

export function schemaOf(value) {
	return bunkerType[typeof value](value)
}

export function sizeofSchema(schema) {
	let sum = 1
	if (typeof schema == 'object')
		for (let key in schema)
			sum += sizeofSchema(schema[key])
	return sum
}

export function writeSchema(schema, buffer, offset = 0) {
	const uint8Array = new Uint8Array(buffer)

	const write = (type) => {
		if (typeof type == 'object') {
			uint8Array[offset++] = Array.isArray(type) ? Type.Array : Type.Object

			for (let key in type)
				write(type[key])
		}
		else 
			uint8Array[offset++] = type
	}
	
	write(schema)
	return offset
}

