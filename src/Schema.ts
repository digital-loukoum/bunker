import Type from './Type'

type Schema =
	| Type
	| ObjectSchema
	| ArraySchema
	| Map<string | number, Schema>
	| ObjectRecord
	| MapRecord
	| Set<Schema>

export default Schema

export type ObjectSchema = { [key: string]: Schema }
export type ArraySchema = [ Schema | null, { [key: string]: Schema }? ]  // a null type indicates an empty array

export class ObjectRecord {
	type: NullableSchema
	keys: string[]
	constructor(type: NullableSchema, keys: string[]) {
		this.keys = keys
		this.type = type
	}
	toObject(): { [key: string]: Schema } {  // downgrade the record to an object
		const schema: { [key: string]: Schema } = {}
		if (this.type == null)
			return schema
		for (const key of this.keys)
			schema[key] = this.type
		return schema
	}
}

export class MapRecord {
	type: NullableSchema
	keys: string[]
	constructor(type: NullableSchema, keys: string[]) {
		this.keys = keys
		this.type = type
	}
	toMap(): Map<string, Schema> {  // downgrade the record to a map
		const schema = new Map<string, Schema>()
		if (this.type == null)
			return schema
		for (const key of this.keys)
			schema.set(key, this.type)
		return schema
	}
}

export type NullableSchema = null | Schema


/* Type guards */
export const isObject = (schema: Schema): schema is ObjectSchema => {
	return schema.constructor == Object
}
export const isObjectRecord = (schema: Schema): schema is ObjectRecord => {
	return schema.constructor == ObjectRecord
}
export const isArray = (schema: Schema): schema is ArraySchema => {
	return schema.constructor == Array
}
export const isSet = (schema: Schema): schema is Set<Schema> => {
	return schema.constructor == Set
}
export const isMap = (schema: Schema): schema is Map<string, Schema> => {
	return schema.constructor == Map
}
export const isMapRecord = (schema: Schema): schema is MapRecord => {
	return schema.constructor == MapRecord
}
