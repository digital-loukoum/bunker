import Schema, { isObject, isObjectRecord, isArray, isSet, isMap, isMapRecord} from '../Schema.js'
import Type from '../Type.js'
import Dispatcher from './Dispatcher.js'
import Handler from './Handler.js'

type PropertyDispatcher = Record<string, Dispatcher>

function objectHandler(dispatchProperty: PropertyDispatcher, object: Record<string, any>) {
	for (const key in dispatchProperty)
		dispatchProperty[key](object[key])
}

function objectRecordHandler(handler: Handler, dispatchElement: Dispatcher, object: Record<string, any>) {
	handler[Type.Integer](Object.keys(object).length)  // we write the length
	for (const key in object) {
		handler[Type.String](key)
		dispatchElement(object[key])
	}
}

function mapHandler(dispatchProperty: PropertyDispatcher, map: Map<string | number, any>) {
	for (const key in dispatchProperty)
		dispatchProperty[key](map.get(key))
}

function mapRecordHandler(handler: Handler, dispatchElement: Dispatcher, map: Map<string, any>) {
	handler[Type.Integer](map.size)  // we write the length
	for (const [key, value] of map.entries()) {
		handler[Type.String](key)
		dispatchElement(value)
	}
}

function arrayHandler(handler: Handler, dispatchElement: Dispatcher, dispatchProperty: PropertyDispatcher, array: Array<any>) {
	handler[Type.Integer](array.length)  // we write the length
	for (const element of array)
		dispatchElement(element)
	for (const key in dispatchProperty)
		dispatchProperty[key](array[key as any])
}

function setHandler(handler: Handler, dispatchElement: Dispatcher, set: Set<any>) {
	handler[Type.Integer](set.size)  // we write the length
	for (const element of set.values())
		dispatchElement(element)
}

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
		return objectHandler.bind(null, propertyDispatcher)
	}

	else if (isObjectRecord(schema)) {
		return objectRecordHandler.bind(null, handler, createDispatcher(schema.type, handler))
	}

	else if (isArray(schema)) {
		const type = schema[0]
		const properties = schema[1]
		const propertyDispatcher: PropertyDispatcher = {}
		
		if (properties)
			for (const key in properties)
				propertyDispatcher[key] = createDispatcher(properties[key], handler)
		
		return arrayHandler.bind(null, handler, createDispatcher(type, handler), propertyDispatcher)
	}
	
	else if (isSet(schema)) {
		const type = schema.values().next().value
		return setHandler.bind(null, handler, createDispatcher(type, handler))
	}

	else if (isMap(schema)) {
		const propertyDispatcher: PropertyDispatcher = {}
		for (const [key, value] of schema.entries())
			propertyDispatcher[key] = createDispatcher(value, handler)
		return mapHandler.bind(null, propertyDispatcher)
	}

	else if (isMapRecord(schema)) {
		return mapRecordHandler.bind(null, handler, createDispatcher(schema.type, handler))
	}

	else return () => {}
}
