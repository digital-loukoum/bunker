import { bunker, debunker, bunkerRawData, bunkerFile } from '../src'
import { encode, decode } from "@msgpack/msgpack"
import { guessSchema, BunkerType } from '../src'

import simpleObject from './samples/simple-object'

console.time("Guess simple schema")
const simpleSchema = guessSchema(simpleObject)
console.timeEnd("Guess simple schema")
console.log("simpleSchema:", simpleSchema)

// console.time("To raw data")
// const rawData = bunkerRawData(simpleObject)
// console.timeEnd("To raw data")
// console.log(rawData)

console.time("To buffer")
const buffer = bunker(simpleObject, simpleSchema)
console.timeEnd("To buffer")
console.log("buffer.length:", buffer.length)

console.time("From buffer")
const simpleObjectFromBunker = debunker(buffer)
console.timeEnd("From buffer")
console.log(simpleObjectFromBunker)


// console.time("To file")
// bunkerFile('test/output/simple-object.bunker', simpleObject)
// console.timeEnd("To file")



/* --------- MESSAGE PACK --------- */
// console.time("Encode with msgpack-js")
// const encoded2 = encode2(simpleObject)
// console.timeEnd("Encode with msgpack-js")


// console.time("Encode with @msgpack/msgpack")
// const encoded = encode(simpleObject)
// console.timeEnd("Encode with @msgpack/msgpack")

