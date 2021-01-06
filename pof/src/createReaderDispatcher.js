
function readerObjectHandler() {
	const result = {}
	for (let key in this) {
		result[key] = this[key]()
	}
	return result
}

export default function createReaderDispatcher(schema, handler) {
	if (typeof schema == 'object') {
		const dispatcher = {}
		for (let key in schema)
			dispatcher[key] = createReaderDispatcher(schema[key], handler)
		return readerObjectHandler.bind(dispatcher)
	}
	return handler[schema]
}
