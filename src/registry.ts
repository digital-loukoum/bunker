import { Dispatcher as Schema } from "./encode/Encoder"
import { Dispatcher as DecoderDispatcher } from "./decode/Decoder"
import schemaOf, { hasMemory } from "./schemaOf"
import { encoderToDecoder } from "./compile"
import { encodeSchema } from "./index"

type Constructor = new (...args: any[]) => any

export type RegistryEntry = {
	constructor: Constructor
	encode: Schema
	decode: DecoderDispatcher
	encodedSchema: Uint8Array
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
		let encode = schema || schemaOf(new constructor())
		if (hasMemory(encode))
			throw new Error(`Circular value in default schema of '${name}'`)

		registry[name] = {
			constructor,
			encode,
			decode: encoderToDecoder(encode),
			encodedSchema: encodeSchema(encode),
		}
	}
}

export default registry
