import Type from './Type.js'
import Schema, {
	mapOf,
	arrayOf,
	ArrayOf,
	setOf,
	SetOf,
	referenceTo,
	SchemaObject,
	MapOf,
} from './Schema.js'
import joinSchemas from './joinSchemas.js'


// return a bunker schema from the result of a `typeof`
const schemaFromType: Record<string, (value: any, cache: Array<Object>) => Schema> = {
	undefined: () => Type.Null,
	number: (value: number) => Number.isInteger(value) ? Type.Integer : Type.Number,
	bigint: () => Type.BigInteger,
	string: () => Type.String,
	boolean: () => Type.Boolean,
	object: (object: Record<string, any>, cache) => {
		if (!object) return Type.Null
		else if (object instanceof Date) return Type.Date
		else if (object instanceof RegExp) return Type.RegExp

		const reference = cache.indexOf(object)
		if (~reference) return referenceTo(reference)
		let schema: Schema

		if (Array.isArray(object)) {
			schema = arrayOf()
			cache.push(object)
			let type: Schema = Type.Unknown
			const otherProperties: Schema = {}
			let hasOtherProperties = false

			for (const key in object) {
				if (Number.isInteger(+key)) {
					if (typeof object[key] == 'function') throw `Cannot bunker function '${object[key].name}' from array`
					type = joinSchemas(type, guessSchema(object[key], cache))
				}
				else if (typeof object[key] != 'function') {
					hasOtherProperties = true
					otherProperties[key] = guessSchema(object[key], cache)
				}
			}
			schema.type = type
			if (hasOtherProperties) {
				(schema as ArrayOf).properties = otherProperties
			}
		}

		else if (object instanceof Set) {
			schema = setOf(Type.Any)
			cache.push(object)
			let type: Schema = Type.Unknown
			for (const value of object) {
				if (typeof value == 'function') throw `Cannot bunker function '${value.name}' from set`
				type = joinSchemas(type, guessSchema(value, cache))
			}
			schema.type = type
			let properties: SchemaObject = {}
			if (fillSchemaObject(object, properties, cache))
				(schema as SetOf).properties = properties
		}

		else if (object instanceof Map) {
			schema = mapOf(Type.Any)
			cache.push(object)
			let type: Schema = Type.Unknown
			for (const [key, value] of object.entries()) {
				if (typeof key == 'function') throw `Cannot bunker key function '${key.name}' from map`
				if (typeof value == 'function') throw `Cannot bunker value function '${value.name}' from map`
				type = joinSchemas(type, guessSchema(value, cache))
			}
			schema.type = type
			let properties: SchemaObject = {}
			if (fillSchemaObject(object, properties, cache))
				(schema as MapOf).properties = properties
		}

		else {  // regular object
			schema = {}
			cache.push(object)
			fillSchemaObject(object, schema, cache)
		}

		return schema
	},
}


// fill a schema object from an object
function fillSchemaObject(object: Record<string, any>, schema: SchemaObject, cache: Array<Object>) {
	let hasProperties = false
	for (const key in object) {
		if (typeof object[key] != 'function') {
			hasProperties = true
			schema[key] = guessSchema(object[key], cache)
		}
	}
	return hasProperties
}


// guess the bunker schema of any value
export default function guessSchema(value: string | number | Object | boolean | bigint, cache = new Array<Object>()): Schema {
	if (typeof value == 'function')
		throw `Cannot serialize a function as bunker data`
	return schemaFromType[typeof value](value, cache)
}
