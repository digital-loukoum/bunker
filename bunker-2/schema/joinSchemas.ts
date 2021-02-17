import Type from '../constants/Type'
import Schema, {
	isPrimitive,
	isObject, BunkerObject,
	nullable, isNullable,
	array, isArray,
	set, isSet,
	record, isRecord,
	map, isMap,
} from './Schema'

// join two object properties
function joinProperties(a?: BunkerObject, b?: BunkerObject): BunkerObject | undefined {
	if (a) return b ? joinBunkerObjects(a, b) : a
	if (b) return a ? joinBunkerObjects(a, b) : b
}

// join two schema objects
function joinBunkerObjects(a: BunkerObject, b: BunkerObject): BunkerObject {
	const schema: BunkerObject = {}
	for (const key in a)
		schema[key] = key in b ? joinSchemas(a[key], b[key]) : nullable(a[key])
	for (const key in b)
		if (!(key in a))  // key exists in b but not in a
			schema[key] = nullable(b[key])
	return schema
}

// join two schemas into a compatible one
export default function joinSchemas(a: Schema, b: Schema): Schema {
	let joint: Schema
	let castToNullable = false
	if (isNullable(a)) {
		castToNullable = true
		a = a.type
	}
	if (isNullable(b)) {
		castToNullable = true
		b = b.type
	}

	if (a == Type.unknown) {
		joint = b
	}
	else if (b == Type.unknown) {
		joint = a
	}
	// -- no common constructor -> cannot join schemas
	else if (a.constructor != b.constructor) {
		joint = Type.any
	}
	// -- join primitives
	else if (isPrimitive(a) || isPrimitive(b)) {
		joint = a === b ? a : Type.any
	} 
	// -- join objects
	else if (isObject(a) && isObject(b)) {
		joint = joinBunkerObjects(a, b)
	}
	else if (isArray(a) && isArray(b)) {
		joint = array(joinSchemas(a.type, b.type), joinProperties(a.properties, b.properties))
	}
	else if (isSet(a) && isSet(b)) {
		joint = set(joinSchemas(a.type, b.type), joinProperties(a.properties, b.properties))
	}
	else if (isMap(a) && isMap(b)) {
		joint = map(joinSchemas(a.type, b.type), joinProperties(a.properties, b.properties))
	}
	else if (isRecord(a) && isRecord(b)) {
		joint = record(joinSchemas(a.type, b.type), joinProperties(a.properties, b.properties))
	}
	else {
		joint = Type.any
	}
	
	return castToNullable ? nullable(joint) : joint
}
