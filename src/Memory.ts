/**
 * A simple class that holds the memory needed for encoders / decoders
 */
export default class Memory<Dispatcher extends Function> {
	constructor(
		public objects: object[] = [],
		public strings: string[] = [],
		public classes: Record<string, Dispatcher> = {},
		public schema = new SchemaMemory<Dispatcher>()
	) {}

	clone() {
		return new Memory<Dispatcher>(
			Array<object>().concat(this.objects),
			Array<string>().concat(this.strings),
			{ ...this.classes },
			this.schema.clone()
		)
	}

	reset() {
		this.objects.length = 0
		this.strings.length = 0
		this.classes = {}
		this.schema.reset()
	}
}

/**
 * Holds the memory specific to schemas
 */
export class SchemaMemory<Dispatcher extends Function> {
	constructor(public objects: object[] = [], public dispatchers: Dispatcher[] = []) {}

	clone() {
		return new SchemaMemory<Dispatcher>(
			Array<object>().concat(this.objects),
			Array<Dispatcher>().concat(this.dispatchers)
		)
	}

	reset() {
		this.objects.length = 0
		this.dispatchers.length = 0
	}

	concatenate(memory: SchemaMemory<Dispatcher>) {
		this.objects = this.objects.concat(memory.objects)
		this.dispatchers = this.dispatchers.concat(memory.dispatchers)
	}
}
