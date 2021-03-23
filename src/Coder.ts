/**
 * Base interface used by Encoder and Decoder
 */
type Coder<Dispatcher extends Function> = {
	memory: Memory<Dispatcher>

	unknown: Dispatcher
	character: Dispatcher
	binary: Dispatcher
	boolean: Dispatcher
	integer: Dispatcher
	positiveInteger: Dispatcher
	bigInteger: Dispatcher
	number: Dispatcher
	string: Dispatcher
	regularExpression: Dispatcher
	date: Dispatcher
	any: Dispatcher

	nullable(dispatch: Dispatcher): Dispatcher
	tuple(...dispatch: Dispatcher[]): Dispatcher

	object(dispatch: Record<string, Dispatcher>): Dispatcher
	array(dispatch: Dispatcher, properties: Record<string, Dispatcher>): Dispatcher
	set(dispatch: Dispatcher, properties: Record<string, Dispatcher>): Dispatcher
	record(dispatch: Dispatcher): Dispatcher
	map(dispatch: Dispatcher, properties: Record<string, Dispatcher>): Dispatcher
}
export default Coder

export class Memory<Dispatcher extends Function> {
	constructor(
		public objects: object[] = [],
		public strings: string[] = [],
		public schema = {
			objects: [] as object[],
			dispatchers: [] as Dispatcher[],
		}
	) {}

	clone() {
		return new Memory<Dispatcher>(
			Array<object>().concat(this.objects),
			Array<string>().concat(this.strings),
			{
				objects: Array<object>().concat(this.schema.objects),
				dispatchers: Array<Dispatcher>().concat(this.schema.dispatchers),
			}
		)
	}

	reset() {
		this.objects.length = 0
		this.strings.length = 0
		this.schema.objects.length = 0
		this.schema.dispatchers.length = 0
	}
}
