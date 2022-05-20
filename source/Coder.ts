import Memory from "./Memory.js"

/**
 * Base interface used by Encoder and Decoder
 */
type Coder<Dispatcher extends Function> = {
	memory: Memory<Dispatcher>

	unknown: Dispatcher
	character: Dispatcher
	binary: Dispatcher
	uint8Array: Dispatcher
	uint16Array: Dispatcher
	uint32Array: Dispatcher
	uint8ClampedArray: Dispatcher
	int8Array: Dispatcher
	int16Array: Dispatcher
	int32Array: Dispatcher
	float32Array: Dispatcher
	float64Array: Dispatcher
	bigInt64Array: Dispatcher
	bigUint64Array: Dispatcher
	arrayBuffer: Dispatcher
	dataView: Dispatcher
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
	tuple(dispatch: [...Dispatcher[]]): Dispatcher

	object(dispatch: Record<string, Dispatcher>): Dispatcher
	array(dispatch: Dispatcher, properties: Record<string, Dispatcher>): Dispatcher
	set(dispatch: Dispatcher, properties: Record<string, Dispatcher>): Dispatcher
	map(
		[key, value]: [Dispatcher, Dispatcher],
		properties: Record<string, Dispatcher>
	): Dispatcher
}
export default Coder
