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

export default (value: any, references: Object[] = []): Schema => {
	function guessSchema(value: any): Schema {
		switch (typeof value) {
			case 'undefined': return nullable()
			case 'number': return Number.isInteger(value) ? Type.integer : Type.number
			case 'bigint': return Type.integer
			case 'string': return Type.string
			case 'boolean': return Type.boolean
			case 'function': throw `Cannot encode a function into bunker data`
			default:
				if (value == null) return nullable()
				if (value instanceof Date) return Type.date
				if (value instanceof RegExp) return Type.regularExpression

				// if we have a reference, return it
				const index = references.indexOf(value)
				if (~index) return reference(index)
				references.push(value)

				// new object
				if (value instanceof Array) return guessArraySchema(value)
				if (value instanceof Set) return guessSetSchema(value)
				if (value instanceof Map) return guessMapSchema(value)
				return guessObjectSchema(value)
		}
	}

	function guessArraySchema(value: any[]): BunkerArray {
		let type: Schema = Type.unknown
		let properties: BunkerObject | undefined = undefined
		let index = 0, indexes = 0
		
		for (let i = 0; i < value.length; i++) {
			if (i in value) indexes++  // empty values are not indexed
			type = joinSchemas(type, guessSchema(value[i]))
		}
		for (const key in value) {
			if (index++ < indexes) continue  // the first keys are always the array values
			if (!properties) properties = {}
			properties[key] = guessSchema(value[key])
		}

		return array(type, properties)
	}

	function guessPropertiesSchema(value: Record<string, any>) {
		let properties: BunkerObject | undefined = undefined
		for (const key in value) {
			if (!properties) properties = {}
			properties[key] = guessSchema(value[key])
		}
		return properties
	}
	
	function guessSetSchema(value: Set<any>): BunkerSet {
		let type: Schema = Type.unknown
		for (const element of value) type = joinSchemas(type, guessSchema(element))
		return set(type, guessPropertiesSchema(value))
	}
	
	function guessObjectSchema(value: Record<string, any>): BunkerObject {
		const schema: BunkerObject = {}
		for (const key in value) schema[key] = guessSchema(value[key])
		return schema
	}
	
	function guessMapSchema(value: Map<string, any>): BunkerMap {
		let type: Schema = Type.unknown
		for (const element of value.values()) type = joinSchemas(type, guessSchema(element))
		return map(type, guessPropertiesSchema(value))
	}	

	return guessSchema(value)
}

