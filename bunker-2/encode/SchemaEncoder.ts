import BufferEncoder from './BufferEncoder'
import Encoder from './Encoder'
import Type from '../constants/Type'
import joinSchemas from '../schema/joinSchemas'
import Schema, {
	nullable,
	reference,
	BunkerObject,
	array, BunkerArray,
	set, BunkerSet,
	map, BunkerMap,
} from '../schema/Schema'


export default class SchemaEncoder extends BufferEncoder {
	// --- guess schema
	guessSchema(value: any): Schema {
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
				const index = this.references.indexOf(value)
				if (~index) return reference(index)
				this.references.push(value)

				// new object
				if (value instanceof Array) return this.guessArraySchema(value)
				if (value instanceof Set) return this.guessSetSchema(value)
				if (value instanceof Map) return this.guessMapSchema(value)
				return this.guessObjectSchema(value)
		}
	}

	guessArraySchema(value: any[]): BunkerArray {
		let type: Schema = Type.unknown
		let properties: BunkerObject | undefined = undefined
		let index = 0, indexes = 0
		
		for (let i = 0; i < value.length; i++) {
			if (i in value) indexes++  // empty values are not indexed
			type = joinSchemas(type, this.guessSchema(value[i]))
		}
		for (const key in value) {
			if (index++ < indexes) continue  // the first keys are always the array values
			if (!properties) properties = {}
			properties[key] = this.guessSchema(value[key])
		}

		return array(type, properties)
	}

	guessPropertiesSchema(value: Record<string, any>) {
		let properties: BunkerObject | undefined = undefined
		for (const key in value) {
			if (!properties) properties = {}
			properties[key] = this.guessSchema(value[key])
		}
		return properties
	}
	
	guessSetSchema(value: Set<any>): BunkerSet {
		let type: Schema = Type.unknown
		for (const element of value) type = joinSchemas(type, this.guessSchema(element))
		return set(type, this.guessPropertiesSchema(value))
	}
	
	guessObjectSchema(value: Record<string, any>): BunkerObject {
		const schema: BunkerObject = {}
		for (const key in value) schema[key] = this.guessSchema(value[key])
		return schema
	}
	
	guessMapSchema(value: Map<string, any>): BunkerMap {
		let type: Schema = Type.unknown
		for (const element of value.values()) type = joinSchemas(type, this.guessSchema(element))
		return map(type, this.guessPropertiesSchema(value))
	}
}
