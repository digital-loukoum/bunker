import Type from './Type.js'

type Schema =
	| Type
	| SchemaObject
	| ArrayOf
	| MapOf
	| RecordOf
	| SetOf
	| Nullable

export default Schema


/* --- Primitives --- */
export const integer = Type.Integer
export const string = Type.String
export const unknown = Type.Unknown
export const regExp = Type.RegExp
export const positiveInteger = Type.PositiveInteger
export const number = Type.Number
export const any = Type.Any
export const boolean = Type.Boolean
export const character = Type.Character
export const bigInteger = Type.BigInteger
export const date = Type.Date
export const nil = Type.Null


/* --- Constructible types --- */
// Object
export type SchemaObject = { [key: string]: Schema }

// Record
export class RecordOf {
	keys?: string[]
	constructor(public type: Schema, keys?: string[]) {
		if (keys) this.keys = keys
	}
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
export const recordOf = (type: Schema, keys?: string[]) => new RecordOf(type, keys)

// Nullable
export class Nullable {
	constructor(public type: Schema) {}
}
export const nullable = (type: Schema) =>
	type == Type.Any || type == Type.Null || type.constructor == Nullable ? type : new Nullable(type)

// Array
export class ArrayOf {
	properties?: SchemaObject
	constructor(public type: Schema, properties?: SchemaObject) {
		if (properties) this.properties = properties
	}
}
export const arrayOf = (type: Schema, properties?: SchemaObject) => new ArrayOf(type, properties)

// Set
export class SetOf {
	properties?: SchemaObject
	constructor(public type: Schema, properties?: SchemaObject) {
		if (properties) this.properties = properties
	}
}
export const setOf = (type: Schema, properties?: SchemaObject) => new SetOf(type, properties)

// Map
export class MapOf {
	keys?: string[]
	properties?: SchemaObject
	constructor(public type: Schema, properties?: SchemaObject, keys?: string[]) {
		if (properties) this.properties = properties
		if (keys) this.keys = keys
	}
}
export const mapOf = (type: Schema, properties?: SchemaObject, keys?: string[]) => new MapOf(type, properties, keys)


/* --- Type guards --- */
export const isPrimitive = (schema: Schema): schema is Type =>
	typeof schema == 'number'

export const isObject = (schema: Schema): schema is SchemaObject =>
	schema.constructor == Object

export const thenIsObject = (_: Schema): _ is SchemaObject => true
export const thenIsRecord = (_: Schema): _ is RecordOf => true
export const thenIsArray = (_: Schema): _ is ArrayOf => true
export const thenIsSet = (_: Schema): _ is SetOf => true
export const thenIsMap = (_: Schema): _ is MapOf => true
export const thenIsNullable = (_: Schema): _ is Nullable => true
