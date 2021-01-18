import Schema, { isObject, isObjectRecord, isArray, isSet, isMap, isMapRecord} from './Schema.js'
import Handler from './Handler'
import Dispatcher from './Dispatcher'
import Type from './Type.js'

type PropertyDispatcher = Record<string, Dispatcher>

/**
 * A dispatcher is a function created from a schema and a handler.
 * Once executed with the value associated with the schema, it executes
 * the right function from the handler.
 */
export default function createDispatcher(schema: Schema, handler: Handler): Dispatcher {
	if (typeof schema == 'number' && schema != Type.Unknown)
		return handler[schema] as Dispatcher
	
	else if (isObject(schema)) {
		const propertyDispatcher: PropertyDispatcher = {}
		for (const key in schema)
			propertyDispatcher[key] = createDispatcher(schema[key], handler)
		return handler[Type.Object].bind(handler, propertyDispatcher)
	}

	else if (isObjectRecord(schema)) {
		return handler[Type.ObjectRecord].bind(handler, createDispatcher(schema.type, handler))
	}

	else if (isArray(schema)) {
		const type = schema[0]
		const properties = schema[1]
		const propertyDispatcher: PropertyDispatcher = {}
		
		if (properties)
			for (const key in properties)
				propertyDispatcher[key] = createDispatcher(properties[key], handler)
		
		return handler[Type.Array].bind(handler, createDispatcher(type, handler), propertyDispatcher)
	}
	
	else if (isSet(schema)) {
		const type = schema.values().next().value
		return handler[Type.Set].bind(handler, createDispatcher(type, handler))
	}

	else if (isMap(schema)) {
		const propertyDispatcher: PropertyDispatcher = {}
		for (const [key, value] of schema.entries())
			propertyDispatcher[key] = createDispatcher(value, handler)
		return handler[Type.Map].bind(handler, propertyDispatcher)
	}

	else if (isMapRecord(schema)) {
		return handler[Type.MapRecord].bind(handler, createDispatcher(schema.type, handler))
	}

	else return () => {}
}
