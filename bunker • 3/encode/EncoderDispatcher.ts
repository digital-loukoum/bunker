import Encoder, { Dispatcher, DispatcherRecord } from './Encoder'
import joinDispatchers from './joinDispatchers'

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
			dispatch = joinDispatchers(dispatch, this.dispatcher(value[i]))
		}
		for (const key in value) {
			if (index++ < indexes) continue  // the first keys are always the array values
			properties[key] = this.dispatcher(value[key])
		}
		return this.array(dispatch, properties)
	}

	private setDispatcher(value: Set<any>) {
		let type: Dispatcher = this.unknown
		for (const element of value) type = joinDispatchers(type, this.dispatcher(element))
		return this.set(type, this.propertiesDispatcher(value))
	}

	private mapDispatcher(value: Map<string, any>) {
		let type: Dispatcher = this.unknown
		for (const element of value.values()) type = joinDispatchers(type, this.dispatcher(element))
		return this.map(type, this.propertiesDispatcher(value))	
	}
}