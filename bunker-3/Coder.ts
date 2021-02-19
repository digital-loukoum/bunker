import { Bound } from './bind'

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

	nullable(dispatch: Dispatcher): Bound<Dispatcher>
	tuple(dispatch: Dispatcher[]): Bound<Dispatcher>

	object(dispatch: Record<string, Dispatcher>): Bound<Dispatcher>
	array(dispatch: Dispatcher, properties: Record<string, Dispatcher>): Bound<Dispatcher>
	set(dispatch: Dispatcher, properties: Record<string, Dispatcher>): Bound<Dispatcher>
	record(dispatch: Dispatcher, properties: Record<string, Dispatcher>): Bound<Dispatcher>
	map(dispatch: Dispatcher, properties: Record<string, Dispatcher>): Bound<Dispatcher>
}
export default Coder