import Type from './Type.js'

import resolveWriter from './resolveWriter.js'
import resolveReader from './resolveReader.js'

import toSize from './writers/toSize.js'
import toFile from './writers/toFile.js'
import toArrayBuffer from './writers/toArrayBuffer.js'

import fromArrayBuffer from './readers/fromArrayBuffer.js'



export function sizeofBunker(object, schema) {
	return resolve(object, schema, toSize)
}


export function bunker(object, schema, file = '') {
	if (typeof schema == 'string') {
		file = schema
		schema = null
	}

	if (file)
		return resolveWriter(object, schema, toFile(file))
	else
		return resolveWriter(object, schema, toArrayBuffer)
}
Object.assign(bunker, Type)


export function debunker(data) {
	if (typeof data == 'string')  // file
		console.log("TODO")
	else  // array buffer
		return resolveReader(fromArrayBuffer(data))
}