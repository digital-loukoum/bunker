
function writerObjectHandler(object) {
	for (let key in this)
		this[key](object[key])
}

async function asyncWriterObjectHandler(object) {
	for (let key in this)
		await this[key](object[key])
}

function writerArrayHandler(arrayValueHandler, array) {
	for (let value of array)
		arrayValueHandler(value)
	if (this) for (let key in this)
		this[key](array[key])
}

async function asyncWriterArrayHandler(arrayValueHandler, array) {
	for (let value of array)
		await arrayValueHandler(value)
	if (this) for (let key in this)
		await this[key](array[key])
}

function createDispatcher(schema, handler, objectHandler, arrayHandler) {
	if (typeof schema == 'object') {
		if (Array.isArray(schema)) {
			const [ typeofArray, properties ] = schema
			let dispatcher = null
			if (properties) {
				dispatcher = {}
				for (let key in properties)
					dispatcher[key] = createDispatcher(properties[key], handler, objectHandler, arrayHandler)
			}
			return arrayHandler.bind(dispatcher, handler[typeofArray])
		}
		else {
			const dispatcher = {}
			for (let key in schema)
				dispatcher[key] = createDispatcher(schema[key], handler, objectHandler, arrayHandler)
			return objectHandler.bind(dispatcher)
		}
	}
	return handler[schema]
}

export function createWriterDispatcher(schema, handler) {
	return createDispatcher(schema, handler, writerObjectHandler, writerArrayHandler)
}

export function createAsyncWriterDispatcher(schema, handler) {
	return createDispatcher(schema, handler, asyncWriterObjectHandler, asyncWriterArrayHandler)
}
