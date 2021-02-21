import Encoder, { Dispatcher, DispatcherRecord } from './Encoder'
import { isAugmented } from '../augment'

/**
 * Extends the EncoderSchema with the 'dispatcher' method which returns the right
 * dispatcher from a given value.
 */
export default abstract class EncoderDispatcher extends Encoder {
	dispatcher(value: any) {
		switch (typeof value) {
			case 'undefined': return this.nullable()
			case 'number': return Number.isInteger(value) ? this.integer : this.number
			case 'bigint': return this.bigInteger
			case 'string': return this.string
			case 'boolean': return this.boolean
			case 'function': throw `Cannot encode a function into bunker data`
			default:
				if (value == null) return this.nullable()
				if (value instanceof Date) return this.date
				if (value instanceof RegExp) return this.regularExpression
	
				// new object
				if (value instanceof Array) return this.arrayDispatcher(value)
				if (value instanceof Set) return this.setDispatcher(value)
				if (value instanceof Map) return this.mapDispatcher(value)
				else return this.object(this.propertiesDispatcher(value))
		}
	}

	private propertiesDispatcher(value: Record<string, any>) {
		let properties: DispatcherRecord = {}
		for (const key in value) properties[key] = this.dispatcher(value[key])
		return properties
	}

	private arrayDispatcher(value: any[]) {
		let dispatch: Dispatcher = this.unknown
		let properties: DispatcherRecord = {}
		let index = 0, indexes = 0
		for (let i = 0; i < value.length; i++) {
			if (i in value) indexes++  // empty values are not indexed
			dispatch = this.joinDispatchers(dispatch, this.dispatcher(value[i]))
		}
		for (const key in value) {
			if (index++ < indexes) continue  // the first keys are always the array values
			properties[key] = this.dispatcher(value[key])
		}
		return this.array(dispatch, properties)
	}

	private setDispatcher(value: Set<any>) {
		let type: Dispatcher = this.unknown
		for (const element of value) type = this.joinDispatchers(type, this.dispatcher(element))
		return this.set(type, this.propertiesDispatcher(value))
	}

	private mapDispatcher(value: Map<string, any>) {
		let type: Dispatcher = this.unknown
		for (const element of value.values()) type = this.joinDispatchers(type, this.dispatcher(element))
		return this.map(type, this.propertiesDispatcher(value))	
	}

	private joinDispatchers(a: Dispatcher, b: Dispatcher): Dispatcher {
		let nullable = false
		let joint: Dispatcher
		if (isAugmented(a) && a.target == this.nullable) {
			nullable = true
			a = a['0']
		}
		if (isAugmented(b) && b.target == this.nullable) {
			nullable = true
			b = b['0']
		}
	
		if (a == this.unknown) joint = b
		else if (b == this.unknown) joint = a
		else if (!isAugmented(a) || !isAugmented(b)) {
			joint = a == b ? a : this.any
		}
		else {  // -- join objects
			if (a.target != b.target) {
				joint = this.any
			}
			else if (a.target == this.object) {
				joint = this.object(this.joinDispatcherRecords(a['0'], b['0']))
			}
			else if (a.target == this.array) {
				joint = this.array(
					this.joinDispatchers(a['0'], b['0']),
					this.joinDispatcherRecords(a['1'], b['1'])
				)
			}
			else if (a.target == this.set) {
				joint = this.set(
					this.joinDispatchers(a['0'], b['0']),
					this.joinDispatcherRecords(a['1'], b['1'])
				)
			}
			else if (a.target == this.map) {
				joint = this.map(
					this.joinDispatchers(a['0'], b['0']),
					this.joinDispatcherRecords(a['1'], b['1'])
				)
			}
			else if (a.target == this.record) {
				joint = this.record(this.joinDispatchers(a['0'], b['0']))
			}
			else {
				joint = this.any
			}
		}
		
		return nullable ? this.nullable(joint) : joint
	}
	
	private joinDispatcherRecords(a: DispatcherRecord, b: DispatcherRecord): DispatcherRecord {
		const dispatcher: DispatcherRecord = {}
		for (const key in a)
			dispatcher[key] = key in b ? this.joinDispatchers(a[key], b[key]) : this.nullable(a[key])
		for (const key in b)
			if (!(key in a))  // key exists in b but not in a
				dispatcher[key] = this.nullable(b[key])
		return dispatcher
	}
}