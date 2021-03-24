import { Dispatcher as Schema } from "./encode/Encoder"
import { Dispatcher as DecoderDispatcher } from "./decode/Decoder"
import schemaOf, { hasMemory, DispatcherWithMemory as SchemaWithMemory } from "./schemaOf"
import { SchemaMemory } from "./Memory"
import { encoderToDecoder } from "./compile"

type InstanceConstructor<T = any> = new (...args: any[]) => T

export type RegistryEntry = {
	name: string
	constructor: InstanceConstructor
	encode: Schema
	decode: DecoderDispatcher
	memory: SchemaMemory<Schema>
}
export type RegistryEntryInput =
	| InstanceConstructor
	| {
			constructor: InstanceConstructor
			name?: string
			schema?: Schema | SchemaWithMemory
	  }

export default new (class Registry {
	entries = {} as Record<string, RegistryEntry>

	// add one or multiple entries
	add(...entries: RegistryEntryInput[]) {
		for (let entry of entries) {
			let memory = new SchemaMemory<Schema>()
			let constructor: InstanceConstructor
			let schema: Schema | SchemaWithMemory
			let name: string
			if (typeof entry == "function") {
				constructor = entry
				schema = schemaOf(new constructor())
				name = constructor.name
			} else {
				constructor = entry.constructor
				schema = entry.schema || schemaOf(new constructor())
				name = entry.name || constructor.name
			}

			if (name in this.entries) {
				if (constructor !== this.entries[name].constructor)
					throw new Error(
						`Trying to register another constructor with the name '${name}'`
					)
				return this
			}
			if (hasMemory(schema)) {
				memory = schema.memory
				schema = schema.dispatcher
			}

			this.entries[name] = {
				name,
				constructor,
				encode: schema,
				decode: encoderToDecoder(schema),
				memory,
			}
		}
		return this
	}

	findEntryFromConstructor(constructor: InstanceConstructor) {
		for (const name in this.entries)
			if (this.entries[name].constructor == constructor) return this.entries[name]
		return null
	}

	findEntryFromInstance(instance: object) {
		const { constructor } = instance
		if (constructor == Object || constructor == null) return null
		return this.findEntryFromConstructor(constructor as InstanceConstructor)
	}
})()
