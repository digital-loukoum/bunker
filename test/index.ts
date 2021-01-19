import {
	guessSchema,

	bunker,
	bunkerRaw,
	bunkerFile,
	bunkerSchema,
	
	debunker,
	debunkerSchema
} from '../src'

import zlib from 'zlib'
import { encode, decode } from '@msgpack/msgpack'
import { inflate, deflate } from 'pako'

import simpleObject from './samples/simple-object'
import hugeObject from './samples/huge-object.json'

async function bench(object: any) {
	/* --------- BUNKER --------- */
	console.time("Guess schema")
	const schema = guessSchema(object)
	console.timeEnd("Guess schema")
	// console.log("Schema:", schema)

	console.time("Bunker")
	const buffer = bunker(object, schema)
	console.timeEnd("Bunker")
	console.log("Length:", buffer.length)
	// console.log("buffer:", buffer)
	
	// console.time("Debunker")
	// const simpleObjectFromBunker = debunker(buffer)
	// console.timeEnd("Debunker")
	// console.log(simpleObjectFromBunker)
	
	
	// console.time("To file")
	// bunkerFile('test/output/simple-object.bunker', object)
	// console.timeEnd("To file")
	
	
	
	/* --------- MESSAGE PACK --------- */
	// console.time("Encode with @msgpack/msgpack")
	// const encoded = encode(object)
	// console.timeEnd("Encode with @msgpack/msgpack")
	// console.log("Length:", encoded.length)
	
	// console.time("Decode with @msgpack/msgpack")
	// const decoded = decode(encoded)
	// console.timeEnd("Decode with @msgpack/msgpack")
	// console.log("Decoded :", decoded)

	/* --------- JSON --------- */
	// console.time("Json")
	// const json = JSON.stringify(object)
	// console.timeEnd("Json")
	// console.log("Length:", json.length)

	/* --------- COMPRESSED JSON --------- */
	// console.time("Pako + Json")
	// const compressed = deflate(JSON.stringify(object))
	// console.timeEnd("Pako + Json")
	// console.log("Length:", compressed.length)

	/* --------- NODE ZLIB --------- */
	// console.time("Zlib + Json")
	// const compressed = deflate(JSON.stringify(object))
	// console.timeEnd("Pako + Json")
	// console.log("Length:", compressed.length)
}

bench(hugeObject)
