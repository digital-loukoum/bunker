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
	dispatchElement: Dispatcher,
	propertyDispatcher: PropertyDispatcher,
	value: Array<any>
) {
	dispatchArray(value)
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
		if (Array.isArray(schema)) {
			const typeofArray = schema[0]
			const properties = schema[1] || {}
			const propertyDispatcher: PropertyDispatcher = {}
			
			for (let key in properties)
				propertyDispatcher[key] = createDispatcher(properties[key], handler)
			
			return arrayHandler.bind(
				null,
				handler[Type.Array],
				createDispatcher(typeofArray, handler),
				propertyDispatcher
			)
		}
		else {
			const propertyDispatcher: PropertyDispatcher = {}
			for (let key in schema)
				propertyDispatcher[key] = createDispatcher(schema[key], handler)
			return objectHandler.bind(null, propertyDispatcher)
		}
	}
	return handler[schema] as Dispatcher
}
