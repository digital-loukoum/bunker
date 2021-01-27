import Type from './Type.js'
import Schema, {
	mapOf,
	arrayOf,
	ArrayOf,
	setOf,
	referenceTo,
	SchemaObject,
} from './Schema.js'
import joinSchemas from './joinSchemas.js'


// return a bunker schema from the result of a `typeof`
const schemaFromType: Record<string, (value: any, cache: Map<Object, Schema>) => Schema> = {
	undefined: () => Type.Null,
	number: (value: number) => Number.isInteger(value) ? Type.Integer : Type.Number,
	bigint: () => Type.BigInteger,
	string: () => Type.String,
	boolean: () => Type.Boolean,
	object: (object: Record<string, any>, cache) => {
		if (!object) return Type.Null
		else if (object instanceof Date) return Type.Date
		else if (object instanceof RegExp) return Type.RegExp

		const cached = cache.get(object)
		if (cached) return referenceTo(cached)
		let schema: Schema

		if (Array.isArray(object)) {
			schema = arrayOf()
			cache.set(object, schema)
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
			cache.set(object, schema)
			let type: Schema = Type.Unknown
			for (const value of object) {
				if (typeof value == 'function') throw `Cannot bunker function '${value.name}' from set`
				type = joinSchemas(type, guessSchema(value, cache))
			}
			schema.type = type
		}

		else if (object instanceof Map) {
			schema = mapOf(Type.Any)
			cache.set(object, schema)
			let type: Schema = Type.Unknown
			for (const [key, value] of object.entries()) {
				if (typeof key == 'function') throw `Cannot bunker key function '${key.name}' from map`
				if (typeof value == 'function') throw `Cannot bunker value function '${value.name}' from map`
				type = joinSchemas(type, guessSchema(value, cache))
			}
			schema.type = type
		}

		else {  // regular object
			schema = {}
			cache.set(object, schema)
			fillSchemaObject(object, schema, cache)
		}

		return schema
	},
}


// fill a schema object from an object
function fillSchemaObject(object: Record<string, any>, schema: SchemaObject, cache: Map<Object, Schema>) {
	for (const key in object) {
		if (typeof object[key] != 'function') {
			schema[key] = guessSchema(object[key], cache)
		}
	}
}


// guess the bunker schema of any value
export default function guessSchema(value: string | number | Object | boolean | bigint, cache = new Map<Object, Schema>()): Schema {
	if (typeof value == 'function')
		throw `Cannot serialize a function as bunker data`
	return schemaFromType[typeof value](value, cache)
}
