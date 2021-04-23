import { SchemaMemory } from "./Memory"
import Encoder, { Dispatcher, DispatcherRecord } from "./encode/Encoder"
import { isAugmented } from "./augment"
import registry from "./registry"

export class DispatcherWithMemory {
	constructor(public dispatcher: Dispatcher, public memory: SchemaMemory<Dispatcher>) {}
}

export default function schemaOf(value: any): DispatcherWithMemory {
	return new SchemaGuesser().guessSchema(value)
}

export function hasMemory(
	dispatcher: Dispatcher | DispatcherWithMemory
): dispatcher is DispatcherWithMemory {
	return dispatcher.constructor == DispatcherWithMemory
}

class SchemaGuesser {
	memory = new SchemaMemory<Dispatcher>()

	guessSchema(value: any): DispatcherWithMemory {
		const dispatcher = this.dispatcher(value)
		return new DispatcherWithMemory(dispatcher, this.memory)
	}

	/**
	 * Guess the most accurate possible type of a value.
	 */
	dispatcher(value: any): Dispatcher {
		switch (typeof value) {
			case "undefined":
				return Encoder.prototype.nullable()
			case "number":
				return Number.isInteger(value)
					? Encoder.prototype.integer
					: Encoder.prototype.number
			case "bigint":
				return Encoder.prototype.bigInteger
			case "string":
				return Encoder.prototype.string
			case "boolean":
				return Encoder.prototype.boolean
			case "function":
				throw `Cannot encode a function into bunker data`
			default: {
				if (value == null) return Encoder.prototype.nullable()
				const entry = registry.findEntryFromInstance(value)
				if (entry) return Encoder.prototype.instance(entry.name)
				if (value instanceof Date) return Encoder.prototype.date
				if (value instanceof RegExp) return Encoder.prototype.regularExpression

				// new object
				let index = this.memory.objects.indexOf(value)
				if (~index) return Encoder.prototype.recall(index)
				index = this.memory.objects.length
				this.memory.objects.push(value)

				let schema: Dispatcher
				if (value instanceof Array) schema = this.arrayDispatcher(value)
				else if (value instanceof Set) schema = this.setDispatcher(value)
				else if (value instanceof Map) schema = this.mapDispatcher(value)
				else schema = Encoder.prototype.object(this.propertiesDispatcher(value))

				return (this.memory.dispatchers[index] = schema)
			}
		}
	}

	propertiesDispatcher(value: Record<string, any>) {
		let properties: DispatcherRecord = {}
		for (const key in value) properties[key] = this.dispatcher(value[key])
		return properties
	}

	arrayDispatcher(value: any[]) {
		let dispatch: Dispatcher = Encoder.prototype.unknown
		let properties: DispatcherRecord = {}
		let index = 0,
			indexes = 0
		for (let i = 0; i < value.length; i++) {
			if (i in value) indexes++ // empty values are not indexed
			dispatch = this.joinDispatchers(dispatch, this.dispatcher(value[i]))
		}
		for (const key in value) {
			if (index++ < indexes) continue // the first keys are always the array values
			properties[key] = this.dispatcher(value[key])
		}
		return Encoder.prototype.array(dispatch, properties)
	}

	setDispatcher(value: Set<any>) {
		let type: Dispatcher = Encoder.prototype.unknown
		for (const element of value)
			type = this.joinDispatchers(type, this.dispatcher(element))
		return Encoder.prototype.set(type, this.propertiesDispatcher(value))
	}

	mapDispatcher(value: Map<string, any>) {
		let type: Dispatcher = Encoder.prototype.unknown
		for (const element of value.values())
			type = this.joinDispatchers(type, this.dispatcher(element))
		return Encoder.prototype.map(type, this.propertiesDispatcher(value))
	}

	joinDispatchers(a: Dispatcher, b: Dispatcher): Dispatcher {
		let nullable = false
		let joint: Dispatcher
		if (isAugmented(a)) {
			if (a.target == Encoder.prototype.nullable) {
				nullable = true
				a = a["0"]
			} else if (a.target == Encoder.prototype.recall) {
				if (isAugmented(b) && b.target == Encoder.prototype.recall && b["0"] == a["0"])
					return a // a & b recall the same dispatcher
				a = this.memory.dispatchers[a["0"]]
				if (!a) return Encoder.prototype.any // recursive type deduction ; we don't know the type of a yet
			}
		}
		if (isAugmented(b)) {
			if (b.target == Encoder.prototype.nullable) {
				nullable = true
				b = b["0"]
			} else if (b.target == Encoder.prototype.recall) {
				b = this.memory.dispatchers[b["0"]]
				if (!b) return Encoder.prototype.any
			}
		}

		if (a == Encoder.prototype.unknown) joint = b
		else if (b == Encoder.prototype.unknown) joint = a
		else if (!isAugmented(a) || !isAugmented(b)) joint = this.joinPrimitives(a, b)
		else {
			// -- join objects
			if (a.target != b.target) {
				joint = Encoder.prototype.any
			} else if (a.target == Encoder.prototype.object) {
				joint = Encoder.prototype.object(this.joinDispatcherProperties(a["0"], b["0"]))
			} else if (a.target == Encoder.prototype.array) {
				joint = Encoder.prototype.array(
					this.joinDispatchers(a["0"], b["0"]),
					this.joinDispatcherProperties(a["1"], b["1"])
				)
			} else if (a.target == Encoder.prototype.recall) {
				if (a["0"] == b["0"]) joint = a
				else joint = Encoder.prototype.any // different references
			} else if (a.target == Encoder.prototype.instance) {
				if (a["0"] == b["0"]) joint = a
				else joint = Encoder.prototype.any // different constructors
			} else if (a.target == Encoder.prototype.set) {
				joint = Encoder.prototype.set(
					this.joinDispatchers(a["0"], b["0"]),
					this.joinDispatcherProperties(a["1"], b["1"])
				)
			} else if (a.target == Encoder.prototype.map) {
				joint = Encoder.prototype.map(
					this.joinDispatchers(a["0"], b["0"]),
					this.joinDispatcherProperties(a["1"], b["1"])
				)
			} else joint = Encoder.prototype.any
		}

		return nullable ? Encoder.prototype.nullable(joint) : joint
	}

	joinDispatcherProperties(a: DispatcherRecord, b: DispatcherRecord): DispatcherRecord {
		const dispatcher: DispatcherRecord = {}
		for (const key in a)
			dispatcher[key] =
				key in b
					? this.joinDispatchers(a[key], b[key])
					: Encoder.prototype.nullable(a[key])
		for (const key in b)
			if (!(key in a))
				// key exists in b but not in a
				dispatcher[key] = Encoder.prototype.nullable(b[key])
		return dispatcher
	}

	joinPrimitives(a: Dispatcher, b: Dispatcher) {
		if (a == b) return a
		if (
			(a == Encoder.prototype.integer && b == Encoder.prototype.number) ||
			(b == Encoder.prototype.integer && a == Encoder.prototype.number)
		)
			return Encoder.prototype.number
		return Encoder.prototype.any
	}
}
