import Type from '../constants/Type'

type Schema =
	| Type
	| Nullable
	| Reference
	| Tuple
	| BunkerObject
	| BunkerArray
	| BunkerSet
	| BunkerRecord
	| BunkerMap
export default Schema

export const isPrimitive = (type: Schema): type is Type => typeof type == 'number'

/* --- Generic types --- */
// -- object
export type BunkerObject = { [key: string]: Schema }
export const isObject = (type: Schema): type is BunkerObject => type.constructor == Object

// -- reference
export class Reference {
	constructor(public reference: number) {}
}
export const reference = (reference: number) => new Reference(reference)
export const isReference = (type: Schema): type is Reference => type.constructor == Reference

// -- tuple
export type Tuple = Schema[]
export const isTuple = (type: Schema): type is Tuple => type.constructor == Array

// -- nullable
export class Nullable {
	constructor(public type: Schema) {}
}
export const nullable = (type: Schema = Type.unknown) => type == Type.any || type.constructor == Nullable ? type : new Nullable(type)
export const isNullable = (type: Schema): type is Nullable => type.constructor == Nullable

// -- array
export class BunkerArray {
	constructor(public type: Schema, public properties: BunkerObject) {}
}
export const array = (type: Schema = Type.unknown, properties: BunkerObject = {}) => new BunkerArray(type, properties)
export const isArray = (type: Schema): type is BunkerArray => type.constructor == BunkerArray

// -- set
export class BunkerSet {
	constructor(public type: Schema, public properties: BunkerObject) {}
}
export const set = (type: Schema = Type.unknown, properties: BunkerObject = {}) => new BunkerSet(type, properties)
export const isSet = (type: Schema): type is BunkerSet => type.constructor == BunkerSet

// -- record
export class BunkerRecord {
	constructor(public type: Schema) {}
}
export const record = (type: Schema = Type.unknown) => new BunkerRecord(type)
export const isRecord = (type: Schema): type is BunkerRecord => type.constructor == BunkerRecord

// -- map
export class BunkerMap {
	constructor(public type: Schema, public properties: BunkerObject) {}
}
export const map = (type: Schema = Type.unknown, properties: BunkerObject = {}) => new BunkerMap(type, properties)
export const isMap = (type: Schema): type is BunkerMap => type.constructor == BunkerMap


/* --- Handmade schema creation --- */
type SchemaBuilder = {
	unknown: Type,
	any: Type,
	boolean: Type,
	character: Type,
	integer: Type,
	positiveInteger: Type,
	bigInteger: Type,
	number: Type,
	string: Type,
	regularExpression: Type,
	date: Type,
	nullable: (type?: Schema) => Type.any | Nullable,
	array: (type?: Schema, properties?: BunkerObject) => BunkerArray,
	set: (type?: Schema, properties?: BunkerObject) => BunkerSet,
	map: (type?: Schema, properties?: BunkerObject) => BunkerMap,
	record: (type?: Schema, properties?: BunkerObject) => BunkerRecord,
}
export const schemaBuilder: SchemaBuilder = {
	unknown: Type.unknown,
	any: Type.any,
	boolean: Type.boolean,
	character: Type.character,
	integer: Type.integer,
	positiveInteger: Type.positiveInteger,
	bigInteger: Type.bigInteger,
	number: Type.number,
	string: Type.string,
	regularExpression: Type.regularExpression,
	date: Type.date,
	nullable,
	array,
	set,
	map,
	record,
}

export const createSchema = (callback: (type: SchemaBuilder) => Schema) => callback(schemaBuilder)