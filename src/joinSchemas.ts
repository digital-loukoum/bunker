import Type from './Type.js'
import Schema, {
	mapOf,
	recordOf,
	arrayOf,
	setOf,
	SchemaObject,
	ArrayOf,
	isObject,
	thenIsArray,
	thenIsMap,
	thenIsObject,
	thenIsRecord,
	thenIsSet,
	nullable,
	RecordOf,
	SetOf,
	MapOf,
	Nullable,
} from './Schema.js'

// join two schemas into a compatible one
export default function joinSchemas(a: Schema, b: Schema): Schema {
	if (a == Type.Null) return nullable(b)
	if (b == Type.Null) return nullable(a)
	let joint!: Schema
	let castToNullable = false
	if (a.constructor == Nullable) {
		castToNullable = true
		a = a.type
	}
	if (b.constructor == Nullable) {
		castToNullable = true
		b = b.type
	}

	if (a == Type.Unknown) joint = b
	else if (b == Type.Unknown) joint = a
	else if (typeof a == 'number' || typeof b == 'number') {
		joint = a === b ? a : Type.Any
	}
	else {
		// we downgrade records to regular objects
		if (a.constructor == Object && b.constructor == RecordOf)  b = b.toObject()
		else if (b.constructor == Object && a.constructor == RecordOf)  a = a.toObject()
		
		if (a.constructor != b.constructor) {
			joint = Type.Any
		}
		/* Join arrays */
		else if (a.constructor == ArrayOf && thenIsArray(b)) {
			joint = arrayOf(joinSchemas(a.type, b.type))
			if (a.properties || b.properties) {
				(joint as ArrayOf).properties = joinSchemas(a.properties || {}, b.properties || {}) as SchemaObject
			}
		}
		/* Join object records */
		else if (a.constructor == RecordOf && thenIsRecord(b)) {
			const jointType: Schema = a.type && b.type ? joinSchemas(a.type, b.type) : a || b
			const keys: string[] = a.keys ? [...a.keys] : []
			b.keys?.forEach(key => keys.includes(key) || keys.push(key))
			joint = recordOf(jointType, keys)
		}
		/* Join objects */
		else if (isObject(a) && thenIsObject(b)) {
			const schema: Schema = {}
			for (const key in a) {
				schema[key] = key in b ? joinSchemas(a[key], b[key]) : nullable(a[key])
			}
			for (const key in b) {
				if (!(key in a)) {  // key exists in b but not in a
					schema[key] = nullable(b[key])
				}
			}
			joint = schema
		}
		/* Join sets */
		else if (a.constructor == SetOf && thenIsSet(b)) {
			joint = setOf(joinSchemas(a.type, b.type))
		}
		/* Join maps */
		else if (a.constructor == MapOf && thenIsMap(b)) {
			const jointType: Schema = a.type && b.type ? joinSchemas(a.type, b.type) : a || b
			const keys: string[] =  ([] as string[]).concat(a.keys || [])
			b.keys?.forEach(key => keys.includes(key) || keys.push(key))
			joint = mapOf(jointType, undefined, keys)
		}
	}
	
	return castToNullable ? nullable(joint) : joint
}