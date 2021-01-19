import Type from './Type.js'
import Schema, {
	ObjectRecord,
	MapRecord,
	ObjectSchema,
	isArray,
	isMap,
	isMapRecord,
	isObject,
	isObjectRecord,
	isSet,
} from './Schema'


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
			let type: Schema = Type.Unknown
			const otherProperties: Schema = {}

			for (const key in object) {
				if (Number.isInteger(+key)) {
					const valueType = guessSchema(object[key])
					type = joinSchemas(type, valueType)
				}
				else if (typeof object[key] != 'function') {
					otherProperties[key] = guessSchema(object[key])
				}
			}
			return [type, otherProperties] as Schema
		}

		else if (object instanceof Set) {
			let type: Schema = Type.Unknown
			for (const value of object) {
				const valueType = guessSchema(value)
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
		
		// else {  // regular object
		// 	const schema: Schema = {}
		// 	let jointType: Schema = Type.Unknown
		// 	const keys: string[] = []

		// 	for (const key in object) {
		// 		if (typeof object[key] != 'function') {
		// 			keys.push(key)
		// 			const valueType = guessSchema(object[key])
		// 			schema[key] = guessSchema(object[key])
		// 			jointType = joinSchemas(jointType, valueType)
		// 		}
		// 	}
		// 	return jointType == Type.Any ? schema : new ObjectRecord(jointType, keys)
		// }

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
	if (a == Type.Unknown) return b
	if (b == Type.Unknown) return a
	if (typeof a == 'number' || typeof b == 'number')
		return a === b ? a : Type.Any
	
	if (isMap(a) && isMapRecord(b))
		b = b.toMap()
	else if (isMap(b) && isMapRecord(a))
		a = a.toMap()
	else if (isObject(a) && isObjectRecord(b))
		b = b.toObject()
	else if (isObject(b) && isObjectRecord(a))
		a = a.toObject()
	
	if (a.constructor != b.constructor)
		return Type.Any
	
	/* Join arrays */
	if (isArray(a) && isArray(b)) {
		const jointType: Schema = joinSchemas(a[0], b[0])
		const jointProperties: Schema = joinSchemas(a[1] || {}, b[1] || {})
		return [jointType, jointProperties] as Schema
	}
	/* Join object records */
	else if (isObjectRecord(a) && isObjectRecord(b)) {
		const jointType: Schema = a.type && b.type ? joinSchemas(a.type, b.type) : a || b
		const keys: string[] = a.keys ? [...a.keys] : []
		b.keys?.forEach(key => keys.includes(key) || keys.push(key))
		return new ObjectRecord(jointType, keys)
	}
	/* Join objects */
	else if (isObject(a) && isObject(b)) {
		const schema: Schema = {}
		for (const key in a) {
			// if (!(key in b)) {
			// 	console.log(`${key} not in b`)
			// 	console.log("a:", a)
			// 	console.log("b:", b)
			// 	throw "STOP"
			// }
			schema[key] = key in b ? joinSchemas((a as ObjectSchema)[key], b[key]) : Type.Any
		}
		for (const key in b) {
			if (!(key in a)) {  // key exists in b but not in a
				// console.log(`${key} not in a`)
				schema[key] = Type.Any
			}
		}
		return schema
	}
	/* Join sets */
	else if (isSet(a) && isSet(b)) {
		const typeA = a.values().next().value
		const typeB = b.values().next().value
		return new Set([joinSchemas(typeA, typeB)])
	}
	/* Join map records */
	else if (isMapRecord(a) && isMapRecord(b)) {
		const jointType: Schema = a.type && b.type ? joinSchemas(a.type, b.type) : a || b
		const keys: string[] =  a.keys ? [...a.keys] : []
		b.keys?.forEach(key => keys.includes(key) || keys.push(key))
		return new MapRecord(jointType, keys)
	}
	/* Join maps */
	else if (isMap(a) && isMap(b)) {
		const schema: Schema = new Map
		for (const [key, value] of a.entries()) {
			schema.set(key, b.has(key) ? joinSchemas(value, b.get(key) as Schema) : Type.Any)
		}
		for (const key of b.keys())
			if (!schema.has(key))  // key exists in b but not in a
				schema.set(key, Type.Any)
		return schema
	}

	else return Type.Any  // cannot happen but satisfy the TS compiler
}



// guess the bunker schema of any value
export default function guessSchema(value: string | number | Object | boolean | bigint): Schema {
	if (typeof value == 'function')
		throw `Cannot serialize a function as bunker data`
	return schemaFromType[typeof value](value)
}
