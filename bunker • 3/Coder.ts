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

	nullable(dispatch: Dispatcher): Dispatcher
	tuple(dispatch: Dispatcher[]): Dispatcher

	object(dispatch: Record<string, Dispatcher>): Dispatcher
	array(dispatch: Dispatcher, properties: Record<string, Dispatcher>): Dispatcher
	set(dispatch: Dispatcher, properties: Record<string, Dispatcher>): Dispatcher
	record(dispatch: Dispatcher): Dispatcher
	map(dispatch: Dispatcher, properties: Record<string, Dispatcher>): Dispatcher
}
export default Coder