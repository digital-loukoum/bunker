import Type from './Type.js'
import { schemaOf } from './schema.js'

import toSize from './writers/toSize.js'
import toFile from './writers/toFile.js'
import toStream from './writers/toStream.js'
import toArrayBuffer from './writers/toArrayBuffer.js'
import toArrayOfBuffers from './writers/toArrayOfBuffers.js'

import fromArrayBuffer from './readers/fromArrayBuffer.js'



export function sizeofBunker(value, schema) {
	return toSize(value, schema)
}


export async function bunker(value, file, schema) {
	if (typeof file == 'object') {
		schema = file
		file = ''
	}
	else if (file == null) {
		schema = schemaOf(value)
		file = ''
	}
	else if (!schema) {
		schema = schemaOf(value)
	}

	if (file)
		return await toFile(value, file, schema)
	else
		return toArrayBuffer(value, schema)
}

bunker.toStream = function(value, stream, schema = schemaOf(value)) {
	return toStream(value, stream, schema)
}

bunker.toArrayOfBuffers = function(value, schema = schemaOf(value)) {
	return toArrayOfBuffers(value, schema)
}

Object.assign(bunker, Type)


export function debunker(data) {
	if (typeof data == 'string')  // file
		console.log("TODO")
	else  // array buffer
		return fromArrayBuffer(data)
}