
function objectResolver() {
	const result = {}
	for (let key in this) {
		result[key] = this[key]()
	}
	return result
}

export function createReaderResolver(type, reader) {
	if (typeof type == 'object') {
		const handler = {}
		for (let key in type)
			handler[key] = createReaderResolver(type[key], reader)
		return objectResolver.bind(handler)
	}
	return reader[type]
}

export default function resolveReader(readerResolver) {

	console.time(`Resolved reader`)
	const result = readerResolver()
	console.timeEnd(`Resolved reader`)

	return result
}

