import { isBound } from "../bind"
import Encoder, { Dispatcher, DispatcherRecord } from "./encoder"

const encoder = Encoder.prototype

export default function joinDispatchers(a: Dispatcher, b: Dispatcher): Dispatcher {
	let nullable = false
	if (isBound(a) && a.__target__ == encoder.nullable) {
		nullable = true
		a = a.__target__
	}
	if (isBound(b) && b.__target__ == encoder.nullable) {
		nullable = true
		b = b.__target__
	}

	if (a == encoder.unknown) a = b
	else if (b == encoder.unknown) {}
	else if (!isBound(a) || !isBound(b)) a != b && (a = encoder.any)
	else {  // -- join objects
		const typeA = a.__target__, typeB = b.__target__

		if (typeA != typeB) {
			a = encoder.any
		}
		else if (typeA == encoder.object) {
			a = encoder.object(joinDispatcherRecords(a.__boundArguments__[0], b.__boundArguments__[0]))
		}
		else if (typeA == encoder.array) {
			a = encoder.array(
				joinDispatchers(a.__boundArguments__[0], b.__boundArguments__[0]),
				joinDispatcherRecords(a.__boundArguments__[1], b.__boundArguments__[1])
			)
		}
		else if (typeA == encoder.set) {
			a = encoder.set(
				joinDispatchers(a.__boundArguments__[0], b.__boundArguments__[0]),
				joinDispatcherRecords(a.__boundArguments__[1], b.__boundArguments__[1])
			)
		}
		else if (typeA == encoder.map) {
			a = encoder.map(
				joinDispatchers(a.__boundArguments__[0], b.__boundArguments__[0]),
				joinDispatcherRecords(a.__boundArguments__[1], b.__boundArguments__[1])
			)
		}
		else if (typeA == encoder.record) {
			a = encoder.record(
				joinDispatchers(a.__boundArguments__[0], b.__boundArguments__[0]),
				joinDispatcherRecords(a.__boundArguments__[1], b.__boundArguments__[1])
			)
		}
		else {
			a = encoder.any
		}
	}
	
	return nullable ? encoder.nullable(a) : a
}

function joinDispatcherRecords(a: DispatcherRecord, b: DispatcherRecord): DispatcherRecord {
	const dispatcher: DispatcherRecord = {}
	for (const key in a)
		dispatcher[key] = key in b ? joinDispatchers(a[key], b[key]) : encoder.nullable(a[key])
	for (const key in b)
		if (!(key in a))  // key exists in b but not in a
			dispatcher[key] = encoder.nullable(b[key])
	return dispatcher
}

