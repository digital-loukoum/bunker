import Schema, { isObject, isPrimitive, Nullable, RecordOf, ArrayOf, SetOf, MapOf } from './Schema.js'
import Handler from './Handler.js'
import Dispatcher from './Dispatcher.js'
import Type from './Type.js'

type PropertyDispatcher = Record<string, Dispatcher>

/**
 * A dispatcher is a function created from a schema and a handler.
 * Once executed with the value associated with the schema, it executes
 * the right function from the handler.
 */
export default function createDispatcher(schema: Schema, handler: Handler): Dispatcher {
	if (isPrimitive(schema)) {
		return handler[schema]
	}
	
	else if (schema.constructor == Nullable) {
		return handler[Type.Nullable].bind(handler, createDispatcher(schema.type, handler))
	}

	else if (isObject(schema)) {
		const propertyDispatcher: PropertyDispatcher = {}
		for (const key in schema)
			propertyDispatcher[key] = createDispatcher(schema[key], handler)
		return handler[Type.Object].bind(handler, propertyDispatcher)
	}

	else if (schema.constructor == RecordOf) {
		return handler[Type.Record].bind(handler, createDispatcher(schema.type, handler))
	}

	else if (schema.constructor == ArrayOf) {
		const propertyDispatcher: PropertyDispatcher = {}
		if (schema.properties) for (const key in schema.properties) {
			propertyDispatcher[key] = createDispatcher(schema.properties[key], handler)
		}
		return handler[Type.Array].bind(handler, createDispatcher(schema.type, handler), propertyDispatcher)
	}
	
	else if (schema.constructor == SetOf) {
		return handler[Type.Set].bind(handler, createDispatcher(schema.type, handler))
	}

	else if (schema.constructor == MapOf) {
		return handler[Type.MapRecord].bind(handler, createDispatcher(schema.type, handler))
	}

	else return () => {}
}
