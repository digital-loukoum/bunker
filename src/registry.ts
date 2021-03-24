import { Dispatcher as Schema } from "./encode/Encoder"
import { Dispatcher as DecoderDispatcher } from "./decode/Decoder"
import schemaOf from "./schemaOf"
import { SchemaMemory } from "./Memory"
import { encoderToDecoder } from "./compile"
import { encodeSchema } from "./index"

type Constructor = new (...args: any[]) => any

export type RegistryEntry = {
	name: string
	constructor: Constructor
	encode: Schema
	decode: DecoderDispatcher
	encodedSchema: Uint8Array
	memory: SchemaMemory<Schema>
}
export type RegistryEntryInput =
	| Constructor
	| {
			constructor: Constructor
			schema?: Schema
	  }

export default new (class Registry implements Record<string, RegistryEntry> {
	[_: string]: RegistryEntry

	// @ts-ignore (add a single entry)
	entry(name: string, entry: RegistryEntryInput) {
		if (typeof entry == "function") entry = { constructor: entry }
		if (name in this) {
			if (entry.constructor !== this[name].constructor)
				throw new Error(`Trying to register another constructor with the name '${name}'`)
			return this
		}

		let { schema, constructor } = entry
		let memory = new SchemaMemory<Schema>()
		if (!schema) {
			const guessedSchema = schemaOf(new constructor())
			memory = guessedSchema.memory
			schema = guessedSchema.dispatcher
		}

		this[name] = {
			name,
			constructor,
			encode: schema,
			decode: encoderToDecoder(schema),
			encodedSchema: encodeSchema(schema),
			memory,
		}
		return this
	}

	// @ts-ignore (add multiple entry)
	add(entries: Record<string, RegistryEntryInput>) {
		for (const name in entries) this.entry(name, entries[name])
		return this
	}

	// @ts-ignore (find entry from constructor)
	findFromConstructor(constructor: Constructor) {
		for (const name in this) if (this[name].constructor == constructor) return this[name]
		return null
	}

	// @ts-ignore (find entry from instance)
	findFromInstance(instance: object) {
		const { constructor } = instance
		if (constructor == Object || constructor == null) return null
		return this.findFromConstructor(constructor as Constructor)
	}
})()
