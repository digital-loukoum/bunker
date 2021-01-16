import Type from './Type'

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

type Schema =
	| Type
	| { [key: string]: Schema }
	| [ Schema | null, { [key: string]: Schema }? ]  // a null type indicates an empty array
	| Map<string, Schema>
	| ObjectRecord
	| MapRecord
	| Set<Schema>

export type NullableSchema = null | Schema



// return a bunker schema from the result of a `typeof`
const schemaFromType: Record<string, (value: any) => Schema> = {
	undefined: () => Type.Undefined,
	number: (value: number) => Number.isInteger(value) ? Type.Integer : Type.Number,
	bigint: () => Type.BigInteger,
	string: () => Type.String,
	boolean: () => Type.Boolean,
	object: (object: Record<string, any>) => {
		if (!object) return Type.Null
		if (object instanceof Date) return Type.Date
		if (object instanceof RegExp) return Type.RegExp

		if (Array.isArray(object)) {
			let type: NullableSchema = null
			const otherProperties: Schema = {}

			for (const key in object) {
				if (Number.isInteger(+key)) {
					const valueType = guessSchema(object[key])
					type = type ? joinSchemas(type, valueType) : valueType
				}
				else if (typeof object[key] != 'function') {
					otherProperties[key] = guessSchema(object[key])
				}
			}
			return [type, otherProperties] as Schema
		}

		else if (object instanceof Set) {
			let type: NullableSchema = null
			for (const value of object) {
				const valueType = guessSchema(value)
				type = type ? joinSchemas(type, valueType) : valueType
			}
			return new Set([type]) as Schema
		}

		else if (object instanceof Map) {
			const mapSchema: Map<string, Schema> = new Map
			let jointType: NullableSchema = null
			const keys: string[] = []

			for (const [key, value] of object.entries()) {
				keys.push(key)
				const valueType = guessSchema(value)
				mapSchema.set(key, valueType)
				jointType = jointType ? joinSchemas(jointType, valueType) : valueType
			}
			return jointType == Type.Any ? mapSchema : new MapRecord(jointType, keys)
		}
		
		else {  // regular object
			const schema: Schema = {}
			let jointType: NullableSchema = null
			const keys: string[] = []

			for (const key in object) {
				if (typeof object[key] != 'function') {
					keys.push(key)
					const valueType = guessSchema(object[key])
					schema[key] = guessSchema(object[key])
					jointType = jointType ? joinSchemas(jointType, valueType) : valueType
				}
			}
			return jointType == Type.Any ? schema : new ObjectRecord(jointType, keys)
		}
	},
}


// join two schemas into a compatible one
function joinSchemas(a: Schema, b: Schema): Schema {
	if (typeof a == 'number' || typeof b == 'number')
		return a === b ? a : Type.Any
	
	if (a.constructor == Map && b.constructor == MapRecord)
		b = b.toMap()
	else if (b.constructor == Map && a.constructor == MapRecord)
		a = a.toMap()
	else if (a.constructor == Object && b.constructor == ObjectRecord)
		b = b.toObject()
	else if (b.constructor == Object && a.constructor == ObjectRecord)
		a = a.toObject()
	
	if (a.constructor != b.constructor)
		return Type.Any
	
	if (a.constructor == Array && b.constructor == Array) {
		const jointType: NullableSchema = a[0] && b[0] ? joinSchemas(a[0], b[0]) : a[0] || b[0]
		const jointProperties: Schema = joinSchemas(a[1] || {}, b[1] || {})
		return [jointType, jointProperties] as Schema
	}
	else if (a.constructor == Set && b.constructor == Set) {
		const typeA = a.values().next().value
		const typeB = b.values().next().value
		return new Set([joinSchemas(typeA, typeB)])
	}
	else if (a.constructor == MapRecord && b.constructor == MapRecord) {
		const jointType: Schema = a.type && b.type ? joinSchemas(a.type, b.type) : a || b
		const keys: string[] = [...a.keys]
		b.keys.forEach(key => keys.includes(key) || keys.push(key))
		return new MapRecord(jointType, keys)
	}
	else if (a.constructor == ObjectRecord && b.constructor == ObjectRecord) {
		const jointType: Schema = a.type && b.type ? joinSchemas(a.type, b.type) : a || b
		const keys: string[] = [...a.keys]
		b.keys.forEach(key => keys.includes(key) || keys.push(key))
		return new ObjectRecord(jointType, keys)
	}
	else if (a.constructor == Map && b.constructor == Map) {
		const schema: Schema = new Map
		for (const [key, value] of a.entries()) {
			schema.set(key, b.has(key) ? joinSchemas(value, b.get(key) as Schema) : Type.Any)
		}
		for (const key of b.keys())
			if (!schema.has(key))  // key exists in b but not in a
				schema.set(key, Type.Any)
		return schema
	}
	else {  // regular object or ObjectRecords
		const schema: Schema = {}
		for (const key in a) {
			// @ts-ignore (compiler does not understand a and b are regular objects ; resolving the issue would badly impact performance)
			schema[key] = key in b ? jointSchema(a[key], b[key]) : Type.Any
		}
		for (const key in b)
			if (!(key in schema))  // key exists in b but not in a
				schema[key] = Type.Any
		return schema
	}
}



// guess the bunker schema of any value
export function guessSchema(value: string | number | Object | boolean | bigint): Schema {
	if (typeof value == 'function')
		throw `Cannot serialize a function into bunker data`
	return schemaFromType[typeof value](value)
}

export default Schema
