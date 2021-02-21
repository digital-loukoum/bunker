import { Augmented } from './augment'

/**
 * Base interface used by Encoder and Decoder
 */
type Coder<Dispatcher extends Function> = {
	unknown: Dispatcher
	character: Dispatcher
	boolean: Dispatcher
	integer: Dispatcher
	positiveInteger: Dispatcher
	bigInteger: Dispatcher
	number: Dispatcher
	string: Dispatcher
	regularExpression: Dispatcher
	date: Dispatcher
	any: Dispatcher

	nullable(dispatch: Dispatcher): Augmented<Dispatcher>
	tuple(dispatch: Dispatcher[]): Augmented<Dispatcher>

	object(dispatch: Record<string, Dispatcher>): Augmented<Dispatcher>
	array(dispatch: Dispatcher, properties: Record<string, Dispatcher>): Augmented<Dispatcher>
	set(dispatch: Dispatcher, properties: Record<string, Dispatcher>): Augmented<Dispatcher>
	record(dispatch: Dispatcher): Augmented<Dispatcher>
	map(dispatch: Dispatcher, properties: Record<string, Dispatcher>): Augmented<Dispatcher>
}
export default Coder