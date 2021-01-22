import Type from './Type.js'
import Schema, {
	ObjectRecord,
	MapRecord,
	isArray,
	isMap,
	isMapRecord,
	isObject,
	isObjectRecord,
	isSet,
	isNullable,
	thenIsArray,
	thenIsMap,
	thenIsMapRecord,
	thenIsObject,
	thenIsObjectRecord,
	thenIsSet,
	Nullable,
} from './Schema'


// return a bunker schema from the result of a `typeof`
const schemaFromType: Record<string, (value: any) => Schema> = {
	undefined: () => Type.Null,
	number: (value: number) => Number.isInteger(value) ? Type.Integer : Type.Number,
	bigint: () => Type.BigInteger,
	string: () => Type.String,
	boolean: () => Type.Boolean,
	object: (object: Record<string, any>, lazy = false) => {
		if (!object) return Type.Null
		else if (object instanceof Date) return Type.Date
		else if (object instanceof RegExp) return Type.RegExp

		else if (Array.isArray(object)) {
			let type: Schema = Type.Unknown
			const otherProperties: Schema = {}
			let hasOtherProperties = false

			for (const key in object) {
				if (Number.isInteger(+key)) {
					const valueType = guessSchema(object[key])
					if (!lazy || type == Type.Unknown) {
						type = joinSchemas(type, valueType)
					}
				}
				else if (typeof object[key] != 'function') {
					hasOtherProperties = true
					otherProperties[key] = guessSchema(object[key])
				}
			}
			return hasOtherProperties ? [type, otherProperties] : [type] as Schema
		}

		else if (object instanceof Set) {
			let type: Schema = Type.Unknown
			for (const value of object) {
				const valueType = guessSchema(value)
				if (!lazy || type == Type.Unknown)
					type = joinSchemas(type, valueType)
			}
			return new Set([type]) as Schema
		}

		else if (object instanceof Map) {
			const mapSchema: Map<string, Schema> = new Map
			let jointType: Schema = Type.Unknown
			const keys: string[] = []

			for (const [key, value] of object.entries()) {
				keys.push(key)
				const valueType = guessSchema(value)
				mapSchema.set(key, valueType)
				jointType = joinSchemas(jointType, valueType)
			}
			return jointType == Type.Any ? mapSchema : new MapRecord(jointType, keys)
		}

		else {  // regular object
			const schema: Schema = {}
			const keys: string[] = []

			for (const key in object) {
				if (typeof object[key] != 'function') {
					keys.push(key)
					schema[key] = guessSchema(object[key])
				}
			}
			return schema
		}
	},
}


// join two schemas into a compatible one
function joinSchemas(a: Schema, b: Schema): Schema {
	if (a == Type.Null) return Nullable(b)
	if (b == Type.Null) return Nullable(a)
	let joint!: Schema
	let nullable = false
	if (isNullable(a)) {
		nullable = true
		a = a.type
	}
	if (isNullable(b)) {
		nullable = true
		b = b.type
	}

	if (a == Type.Unknown) joint = b
	else if (b == Type.Unknown) joint = a
	else if (typeof a == 'number' || typeof b == 'number') {
		joint = a === b ? a : Type.Any
	}
	else {
		// we downgrade records to regular data
		if (isMap(a) && isMapRecord(b))             b = b.toMap()
		else if (isMap(b) && isMapRecord(a))        a = a.toMap()
		else if (isObject(a) && isObjectRecord(b))  b = b.toObject()
		else if (isObject(b) && isObjectRecord(a))  a = a.toObject()
		
		if (a.constructor != b.constructor) {
			joint = Type.Any
		}
		/* Join arrays */
		else if (isArray(a) && thenIsArray(b)) {
			const jointType: Schema = joinSchemas(a[0], b[0])
			if (!a[1] && !b[1]) {
				joint = [jointType]
			}
			else {
				const jointProperties: Schema = joinSchemas(a[1] || {}, b[1] || {})
				joint = [jointType, jointProperties] as Schema
			}
		}
		/* Join object records */
		else if (isObjectRecord(a) && thenIsObjectRecord(b)) {
			const jointType: Schema = a.type && b.type ? joinSchemas(a.type, b.type) : a || b
			const keys: string[] = a.keys ? [...a.keys] : []
			b.keys?.forEach(key => keys.includes(key) || keys.push(key))
			joint = new ObjectRecord(jointType, keys)
		}
		/* Join objects */
		else if (isObject(a) && thenIsObject(b)) {
			const schema: Schema = {}
			for (const key in a) {
				schema[key] = key in b ? joinSchemas(a[key], b[key]) : Nullable(a[key])
			}
			for (const key in b) {
				if (!(key in a)) {  // key exists in b but not in a
					schema[key] = Nullable(b[key])
				}
			}
			joint = schema
		}
		/* Join sets */
		else if (isSet(a) && thenIsSet(b)) {
			const typeA = a.values().next().value
			const typeB = b.values().next().value
			joint = new Set([joinSchemas(typeA, typeB)])
		}
		/* Join map records */
		else if (isMapRecord(a) && thenIsMapRecord(b)) {
			const jointType: Schema = a.type && b.type ? joinSchemas(a.type, b.type) : a || b
			const keys: string[] =  a.keys ? [...a.keys] : []
			b.keys?.forEach(key => keys.includes(key) || keys.push(key))
			joint = new MapRecord(jointType, keys)
		}
		/* Join maps */
		else if (isMap(a) && thenIsMap(b)) {
			const schema: Schema = new Map
			for (const [key, value] of a.entries()) {
				if (b.has(key))
					schema.set(key, joinSchemas(value, b.get(key) as Schema))
				else
					schema.set(key, Nullable(value))
			}
			for (const [key, value] of b.entries())
				if (!schema.has(key))  // key exists in b but not in a
					schema.set(key, Nullable(value))
			joint = schema
		}
	}
	
	return nullable && joint != Type.Any ? Nullable(joint) : joint
}



// guess the bunker schema of any value
export default function guessSchema(value: string | number | Object | boolean | bigint): Schema {
	if (typeof value == 'function')
		throw `Cannot serialize a function as bunker data`
	return schemaFromType[typeof value](value)
}
