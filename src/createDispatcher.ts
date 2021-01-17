

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
