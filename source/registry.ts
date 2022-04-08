import { Dispatcher as Schema } from "./encode/Encoder.js"
import { Dispatcher as DecoderDispatcher } from "./decode/Decoder.js"
import encoderToDecoder from "./encoderToDecoder.js"

export type InstanceConstructor<T = any> = new (...args: any[]) => T

export type RegistryEntry = {
	name: string
	constructor: InstanceConstructor
	encode: Schema
	decode: DecoderDispatcher
}
export type RegistryEntryInput = {
	name?: string
	constructor: InstanceConstructor
	schema: Schema
}

export default new (class Registry {
	entries = {} as Record<string, RegistryEntry>

	// add one or multiple entries
	add(constructor: InstanceConstructor, schema: Schema, name?: string) {
		if (!name) name = constructor.name
		if (name in this.entries) {
			if (constructor !== this.entries[name].constructor)
				throw new Error(`Trying to register another constructor with the name '${name}'`)
			return this
		}

		this.entries[name] = {
			name,
			constructor,
			encode: schema,
			decode: encoderToDecoder(schema),
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
