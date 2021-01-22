import Type from './Type.js'

type Schema =
	| Type
	| ObjectSchema
	| ArraySchema
	| Map<string | number, Schema>
	| ObjectRecord
	| MapRecord
	| Set<Schema>
	| _Nullable

export default Schema

export type ObjectSchema = { [key: string]: Schema }
export type ArraySchema = [ Schema, { [key: string]: Schema }? ]  // a null type indicates an empty array

export class ObjectRecord {
	constructor(
		public type: Schema,
		public keys?: string[],
	) {}

	toObject(): { [key: string]: Schema } {  // downgrade the record to an object
		const schema: { [key: string]: Schema } = {}
		if (this.type == null)
			return schema
		if (this.keys)
			for (const key of this.keys)
				schema[key] = this.type
		return schema
	}
}

export class MapRecord {
	constructor(
		public type: Schema,
		public keys?: string[],
	) {}

	toMap(): Map<string, Schema> {  // downgrade the record to a map
		const schema = new Map<string, Schema>()
		if (this.type == null)
			return schema
		if (this.keys)
			for (const key of this.keys)
				schema.set(key, this.type)
		return schema
	}
}

class _Nullable {
	constructor(public type: Schema) {}
}
export const Nullable = (type: Schema) =>
	type == Type.Any || type == Type.Null || isNullable(type) ? type : new _Nullable(type)


/* Type guards */
export const isObject = (schema: Schema): schema is ObjectSchema =>
	schema.constructor == Object

export const isObjectRecord = (schema: Schema): schema is ObjectRecord =>
	schema.constructor == ObjectRecord

export const isArray = (schema: Schema): schema is ArraySchema =>
	schema.constructor == Array

export const isSet = (schema: Schema): schema is Set<Schema> =>
	schema.constructor == Set

export const isMap = (schema: Schema): schema is Map<string, Schema> =>
	schema.constructor == Map

export const isMapRecord = (schema: Schema): schema is MapRecord =>
	schema.constructor == MapRecord

export const isNullable = (schema: Schema): schema is _Nullable =>
	schema.constructor == _Nullable

export const thenIsObject = (_: Schema): _ is ObjectSchema => true
export const thenIsObjectRecord = (_: Schema): _ is ObjectRecord => true
export const thenIsArray = (_: Schema): _ is ArraySchema => true
export const thenIsSet = (_: Schema): _ is Set<Schema> => true
export const thenIsMap = (_: Schema): _ is Map<string, Schema> => true
export const thenIsMapRecord = (_: Schema): _ is MapRecord => true
export const thenIsNullable = (_: Schema): _ is _Nullable => true
