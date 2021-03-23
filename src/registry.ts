import { Dispatcher as Schema } from "./encode/Encoder"

type Constructor = new (...args: any[]) => any
export type RegistryEntry = {
	constructor: new (...args: any[]) => any
	schema?: Schema
	encodedSchema?: Uint8Array
}

const registry = new (class Registry implements Record<string, RegistryEntry> {
	[_: string]: RegistryEntry
})()

function register(name: string, constructor: Constructor, schema?: Schema): void
function register(entries: Record<string, RegistryEntry>): void
function register(
	entries: string | Record<string, RegistryEntry>,
	constructor?: Constructor,
	schema?: Schema
): void {
	if (typeof entries == "string") {
		if (!constructor) throw new Error(`Missing constructor for entry '${entries}'`)
		registry[entries] = { constructor, schema }
	} else {
		Object.assign(registry, entries)
	}
}

export default registry
export { register }
