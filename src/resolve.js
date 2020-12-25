import { schemaOf } from './schema.js'


function objectResolver(object) {
	for (let key in this)
		this[key](object[key])
}

function createResolver(type, writer) {
	if (typeof type == 'object') {
		const handler = {}
		for (let key in type)
			handler[key] = createResolver(type[key], writer)
		return objectResolver.bind(handler)
	}
	return writer[type]
}

export default function resolve(object, schema, to) {
	if (!schema) schema = schemaOf(object)

	const writer = to(object, schema)
	const resolver = createResolver(schema, writer)

	console.time(`Resolved ${to.name}`)
	resolver(object)
	console.timeEnd(`Resolved ${to.name}`)
	return writer.result
}

