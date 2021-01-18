import {
	guessSchema,

	bunker,
	bunkerRaw,
	bunkerFile,
	bunkerSchema,
	
	debunker,
	debunkerSchema
} from '../src'
import { encode, decode } from '@msgpack/msgpack'

import simpleObject from './samples/simple-object'
import hugeObject from './samples/huge-object.json'


function bench(object: any) {
	/* --------- BUNKER --------- */
	console.time("Guess schema")
	const schema = guessSchema(object)
	console.timeEnd("Guess schema")
	console.log("Schema:", schema)

	console.time("Bunker")
	const buffer = bunker(object, schema)
	console.timeEnd("Bunker")
	console.log("buffer.length:", buffer.length)
	// console.log("buffer:", buffer)
	
	// console.time("Debunker")
	// const simpleObjectFromBunker = debunker(buffer)
	// console.timeEnd("Debunker")
	// console.log(simpleObjectFromBunker)
	
	
	// console.time("To file")
	// bunkerFile('test/output/simple-object.bunker', object)
	// console.timeEnd("To file")
	
	
	
	/* --------- MESSAGE PACK --------- */
	console.time("Encode with @msgpack/msgpack")
	const encoded = encode(object)
	console.timeEnd("Encode with @msgpack/msgpack")
	console.log("Buffer length:", encoded.length)
	
	// console.time("Decode with @msgpack/msgpack")
	// const decoded = decode(encoded)
	// console.timeEnd("Decode with @msgpack/msgpack")
	// console.log("Decoded :", decoded)

	/* --------- JSON --------- */
	console.time("Json")
	const json = JSON.stringify(object)
	console.timeEnd("Json")
	console.log("json.length:", json.length)
}

bench(hugeObject)
