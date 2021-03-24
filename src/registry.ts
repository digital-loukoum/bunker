import { Dispatcher as Schema } from "./encode/Encoder"
import { Dispatcher as DecoderDispatcher } from "./decode/Decoder"
import schemaOf from "./schemaOf"
import { SchemaMemory } from "./Memory"
import { encoderToDecoder } from "./compile"
import { encodeSchema } from "./index"

type Constructor = new (...args: any[]) => any

export type RegistryEntry = {
	constructor: Constructor
	encode: Schema
	decode: DecoderDispatcher
	encodedSchema: Uint8Array
	memory: SchemaMemory<Schema>
}
export type RegistryEntryInput = {
	constructor: Constructor
	schema?: Schema
}

const registry = new (class Registry implements Record<string, RegistryEntry> {
	[_: string]: RegistryEntry
})()

export function register(entries: Record<string, RegistryEntryInput>) {
	for (const name in entries) {
		if (name in registry) {
			if (entries[name].constructor !== registry[name].constructor)
				throw new Error(`Trying to register another constructor with the name '${name}'`)
			continue
		}

		let { schema, constructor } = entries[name]
		let memory = new SchemaMemory<Schema>()
		if (!schema) {
			const guessedSchema = schemaOf(new constructor())
			memory = guessedSchema.memory
			schema = guessedSchema.dispatcher
		}

		registry[name] = {
			constructor,
			encode: schema,
			decode: encoderToDecoder(schema),
			encodedSchema: encodeSchema(schema),
			memory,
		}
	}
}

export default registry
