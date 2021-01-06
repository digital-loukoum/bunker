
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

		if (Array.isArray(object)) {
			const schema = [schemaOf(object[0])]
			
			const otherKeys = null
			for (let key in object) {
				if (!Number.isInteger(+key)) {
					if (!otherKeys) otherKeys = {}
					otherKeys[key] = schemaOf(object[key])
				}
			}
			if (otherKeys) schema.push(otherKeys)
			return schema
		}
		else {
			const schema = {}

			for (let key in object)
				if (object[key] !== undefined && typeof object[key] != 'function')
					schema[key] = schemaOf(object[key])
	
			return schema
		}
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
				uint8Array[offset++] = 0  // end of key
				write(type[key])
			}

			uint8Array[offset++] = 0  // end of object
		}
		else uint8Array[offset++] = type
	}
	
	write(schema)
	return offset
}

export async function walkSchema(schema, callback) {
	if (typeof schema == 'object') {
		await callback(new Uint8Array([Array.isArray(schema) ? Type.Array : Type.Object]))

		for (const key in schema) {
			await callback(encode(key))
			await callback(new Uint8Array([0]))  // end of key
			await walkSchema(schema[key])
		}

		await callback(new Uint8Array([0]))  // end of object
	}
	else await callback(new Uint8Array([schema]))
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