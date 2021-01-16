import Schema from '../Schema.js'
import Type from '../Type.js'
import Dispatcher from './Dispatcher.js'
import Handler from './Handler.js'

type PropertyDispatcher = Record<string, Dispatcher>

function objectHandler(propertyDispatcher: PropertyDispatcher, value: Record<string, any>) {
	for (const key in propertyDispatcher)
		propertyDispatcher[key](value[key])
}

function arrayHandler(
	dispatchArray: Dispatcher,
	dispatchElement: Dispatcher | null,
	propertyDispatcher: PropertyDispatcher,
	value: Array<any>
) {
	dispatchArray(value)
	if (dispatchElement)  // if the array is not empty
		for (let element of value)
			dispatchElement(element)
	for (const key in propertyDispatcher)
		propertyDispatcher[key](value[key as any])
}

/**
 * A dispatcher is a function created from a schema and a handler.
 * Once executed with the value associated with the schema, it executes
 * the right function from the handler.
 */
export default function createDispatcher(schema: Schema, handler: Handler): Dispatcher {
	if (typeof schema == 'object') {
		if (schema.constructor == Array) {
			const typeofArray = schema[0]
			const properties = schema[1] || {}
			const propertyDispatcher: PropertyDispatcher = {}
			
			for (let key in properties)
				propertyDispatcher[key] = createDispatcher(properties[key], handler)
			
			return arrayHandler.bind(
				null,
				handler[Type.Array],
				typeofArray ? createDispatcher(typeofArray, handler) : null,
				propertyDispatcher
			)
		}
		// else if (schema.constructor == Set) {
		// 	return handler[schema] as Dispatcher
		// }
		// else if (schema.constructor == Map) {
		// 	return handler[schema] as Dispatcher
		// }
		// else if (schema.constructor == BunkerRecord) {
		// 	return handler[schema] as Dispatcher
		// }
		else {  // regular object
			const propertyDispatcher: PropertyDispatcher = {}
			for (let key in schema) {
				// @ts-ignore (compiler does not guess schema type from all previous conditions)
				propertyDispatcher[key] = createDispatcher(schema[key], handler)
			}
			return objectHandler.bind(null, propertyDispatcher)
		}
	}

	return handler[schema] as Dispatcher
}
