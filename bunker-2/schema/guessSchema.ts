import Type from '../constants/Type'
import joinSchemas from './joinSchemas'
import Schema, {
	nullable,
	reference,
	BunkerObject,
	array, BunkerArray,
	set, BunkerSet,
	map, BunkerMap,
} from './Schema'

/**
 * Guess the schema of the given value (it can be of any type except function)
 */
function guessSchema(value: any, cache = new WeakMap<object, Schema>()): Schema {
	switch (typeof value) {
		case 'undefined': return nullable()
		case 'number': return Number.isInteger(value) ? Type.integer : Type.number
		case 'bigint': return Type.bigInteger
		case 'string': return Type.string
		case 'boolean': return Type.boolean
		case 'function': throw `Cannot encode a function into bunker data`
		default:
			if (value == null) return nullable()
			if (value instanceof Date) return Type.date
			if (value instanceof RegExp) return Type.regularExpression

			// if we have a schema reference, return it
			const cached = cache.get(value)
			if (cached) return cached
			let schema: Schema

			// new object
			if (value instanceof Array) schema = guessArraySchema(value, cache)
			if (value instanceof Set) schema = guessSetSchema(value, cache)
			if (value instanceof Map) schema = guessMapSchema(value, cache)
			else schema = guessObjectSchema(value, cache)
			
	}
}

function guessArraySchema(value: any[], cache: WeakMap<object, Schema>): BunkerArray {
	let type: Schema = Type.unknown
	let properties: BunkerObject = {}
	let index = 0, indexes = 0
	for (let i = 0; i < value.length; i++) {
		if (i in value) indexes++  // empty values are not indexed
		type = joinSchemas(type, guessSchema(value[i], cache))
	}
	for (const key in value) {
		if (index++ < indexes) continue  // the first keys are always the array values
		properties[key] = guessSchema(value[key], cache)
	}
	return new BunkerArray(type, properties)
}

function guessPropertiesSchema(value: Record<string, any>, cache: WeakMap<object, Schema>) {
	let properties: BunkerObject = {}
	for (const key in value) properties[key] = guessSchema(value[key], cache)
	return properties
}

function guessSetSchema(value: Set<any>, cache: WeakMap<object, Schema>): BunkerSet {
	let type: Schema = Type.unknown
	for (const element of value) type = joinSchemas(type, guessSchema(element, cache))
	return new BunkerSet(type, guessPropertiesSchema(value, cache))
}

function guessObjectSchema(value: Record<string, any>, cache: WeakMap<object, Schema>): BunkerObject {
	const schema: BunkerObject = {}
	for (const key in value) schema[key] = guessSchema(value[key], cache)
	return schema
}

function guessMapSchema(value: Map<string, any>, cache: WeakMap<object, Schema>): BunkerMap {
	let type: Schema = Type.unknown
	for (const element of value.values()) type = joinSchemas(type, guessSchema(element, cache))
	return new BunkerMap(type, guessPropertiesSchema(value, cache))
}