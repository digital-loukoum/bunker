import { Dispatcher as Schema } from "./encode/Encoder"
import { Dispatcher as DecoderDispatcher } from "./decode/Decoder"
import schemaOf, { hasMemory, DispatcherWithMemory as SchemaWithMemory } from "./schemaOf"
import { SchemaMemory } from "./Memory"
import { encoderToDecoder } from "./compile"
import { encodeSchema } from "./index"

export type RegistryEntry = {
	name: string
	constructor: FunctionConstructor
	encode: Schema
	decode: DecoderDispatcher
	encodedSchema: Uint8Array
	memory: SchemaMemory<Schema>
}
export type RegistryEntryInput =
	| FunctionConstructor
	| {
			constructor: FunctionConstructor
			schema?: Schema | SchemaWithMemory
	  }

export default new (class Registry {
	data = {} as Record<string, RegistryEntry>

	// add a single entry
	entry(
		name: string,
		constructor: FunctionConstructor,
		schema?: Schema | SchemaWithMemory
	) {
		if (name in this.data) {
			if (constructor !== this.data[name].constructor)
				throw new Error(`Trying to register another constructor with the name '${name}'`)
			return this
		}

		let memory = new SchemaMemory<Schema>()
		if (!schema) schema = schemaOf(new constructor())
		if (hasMemory(schema)) {
			memory = schema.memory
			schema = schema.dispatcher
		}
		this.data[name] = {
			name,
			constructor,
			encode: schema,
			decode: encoderToDecoder(schema),
			encodedSchema: encodeSchema(schema),
			memory,
		}
		return this
	}

	// add multiple entry
	entries(entries: Record<string, RegistryEntryInput>) {
		for (const name in entries) {
			const entry = entries[name]
			if (typeof entry == "function") this.entry(name, entry)
			else this.entry(name, entry.constructor, entry.schema)
		}
		return this
	}

	// find entry from constructor
	findFromConstructor(constructor: FunctionConstructor) {
		for (const name in this.data)
			if (this.data[name].constructor == constructor) return this[name]
		return null
	}

	// find entry from instance
	findFromInstance(instance: object) {
		const { constructor } = instance
		if (constructor == Object || constructor == null) return null
		return this.findFromConstructor(constructor as FunctionConstructor)
	}
})()
