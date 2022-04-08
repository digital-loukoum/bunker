import compile from "./compile.js"
import Encoder, { Dispatcher as Schema } from "./encode/Encoder.js"
import schemaOf, { DispatcherWithMemory as SchemaWithMemory } from "./schemaOf.js"
import registry, { InstanceConstructor } from "./registry.js"
import BufferEncoder from "./encode/BufferEncoder.js"
import BufferDecoder from "./decode/BufferDecoder.js"

export { schemaOf, Schema, SchemaWithMemory, compile, registry }

export function bunker(
	value: any,
	schema?: Schema | SchemaWithMemory,
	encoder = new BufferEncoder()
): Uint8Array {
	if (!schema) schema = schemaOf(value)
	return encoder.encode(value, schema)
}

export function debunker(data: Uint8Array): unknown {
	return new BufferDecoder(data).decode()
}

export function register(
	constructor: InstanceConstructor,
	schema: Schema,
	name?: string
): void {
	registry.add(constructor, schema, name)
}

export function encodeSchema(schema: Schema) {
	const encoder = new BufferEncoder()
	encoder.schema(schema)
	return encoder.data
}
bunker.compile = compile
bunker.registry = registry
bunker.register = register
bunker.encodeSchema = encodeSchema

// we export the schema constructors
export const {
	character,
	binary,
	boolean,
	positiveInteger,
	integer,
	bigInteger,
	number,
	string,
	regularExpression,
	date,
	any,
	nullable,
	tuple,
	instance,
	object,
	array,
	set,
	map,
} = Encoder.prototype
bunker.character = character
bunker.binary = binary
bunker.boolean = boolean
bunker.positiveInteger = positiveInteger
bunker.integer = integer
bunker.bigInteger = bigInteger
bunker.number = number
bunker.string = string
bunker.regularExpression = regularExpression
bunker.date = date
bunker.any = any
bunker.nullable = nullable
bunker.tuple = tuple
bunker.instance = map
bunker.object = object
bunker.array = array
bunker.set = set
bunker.map = map
