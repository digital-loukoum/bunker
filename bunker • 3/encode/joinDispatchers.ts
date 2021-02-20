import { Bound } from "../bind"
import Encoder, { Dispatcher, DispatcherRecord } from "./Encoder"

const encoder = Encoder.prototype

export default function joinDispatchers(a: Bound<Dispatcher>, b: Bound<Dispatcher>): Bound<Dispatcher> {
	let nullable = false
	if (isBound(a) && a.target == encoder.nullable) {
		nullable = true
		a = a.target
	}
	if (isBound(b) && b.target == encoder.nullable) {
		nullable = true
		b = b.target
	}

	if (a == encoder.unknown) a = b
	else if (b == encoder.unknown) {}
	else if (!isBound(a) || !isBound(b)) a != b && (a = encoder.any)
	else {  // -- join objects
		const typeA = a.target, typeB = b.target

		if (typeA != typeB) {
			a = encoder.any
		}
		else if (typeA == encoder.object) {
			a = encoder.object(joinDispatcherRecords(a['0'], b['0']))
		}
		else if (typeA == encoder.array) {
			a = encoder.array(
				joinDispatchers(a['0'], b['0']),
				joinDispatcherRecords(a['1'], b['1'])
			)
		}
		else if (typeA == encoder.set) {
			a = encoder.set(
				joinDispatchers(a['0'], b['0']),
				joinDispatcherRecords(a['1'], b['1'])
			)
		}
		else if (typeA == encoder.map) {
			a = encoder.map(
				joinDispatchers(a['0'], b['0']),
				joinDispatcherRecords(a['1'], b['1'])
			)
		}
		else if (typeA == encoder.record) {
			a = encoder.record(joinDispatchers(a['0'], b['0']))
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

