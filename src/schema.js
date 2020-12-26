
import Type from './Type.js'
import { encode, decode } from './utf8string.js'

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
	if (typeof schema == 'object') {
		for (let key in schema)
			sum += encode(key).length + 1 + sizeofSchema(schema[key])
		sum++  // end of object character
	}
	return sum
}

export function writeSchema(schema, buffer, offset = 0) {
	const uint8Array = new Uint8Array(buffer)

	const write = (type) => {
		if (typeof type == 'object') {
			uint8Array[offset++] = Array.isArray(type) ? Type.Array : Type.Object

			for (const key in type) {
				const keyData = encode(key)
				uint8Array.set(keyData, offset)
				offset += keyData.length
				uint8Array[offset++] = 0  // end of string
				write(type[key])
			}

			uint8Array[offset++] = 0  // end of object
		}
		else 
			uint8Array[offset++] = type
	}
	
	write(schema)
	return offset
}

export function readSchema(buffer, offset = 0) {
	const uint8Array = new Uint8Array(buffer)

	const read = () => {
		const type = uint8Array[offset++]

		if (type >= Type.Object) {  // object or array
			const schema = {}

			while (uint8Array[offset]) {
				const begin = offset  // start of key
				while (uint8Array[++offset]);  // end of key
				const key = decode(uint8Array, begin, offset++)
				schema[key] = read()
			}
			
			offset++
			return schema
		}

		return type
	}

	return read()
}