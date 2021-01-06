
import { bunker, debunker } from '../src/bunker.js'
import { schemaOf } from '../src/schema.js'
import sample from './samples/sample.js'

import fs from 'fs'


console.time("Read huge file")
const hugeData = fs.readFileSync('test/samples/huge.json')
console.timeEnd("Read huge file")

console.time("Json parse huge file")
const hugeObject = JSON.parse(hugeData)
console.timeEnd("Json parse huge file")


console.log("Schema (sample) : ", schemaOf(sample))
console.log("Schema (huge) : ", schemaOf(hugeObject))



// console.log('\n------- WRITING FILE ASYNC -------')
// console.time("Bunker file async")
// console.time("Transforming data")
// let arrayBuffer = await bunker(sample)
// console.timeEnd("Transforming data")

// console.time("Transforming data (warm)")
// arrayBuffer = await bunker(sample)
// console.timeEnd("Transforming data (warm)")

// arrayBuffer = await bunker(sample)
// arrayBuffer = await bunker(sample)
// arrayBuffer = await bunker(sample)
// arrayBuffer = await bunker(sample)
// arrayBuffer = await bunker(sample)
// console.time("Transforming data (hot)")
// arrayBuffer = await bunker(sample)
// console.timeEnd("Transforming data (hot)")

// fs.writeFile('output.async.bunker', new Uint8Array(arrayBuffer), () => {
// 	console.timeEnd("Bunker file async")
// })



// console.log('\n------- WRITING FILE SYNC -------')
// console.time("Bunker file Sync")
// let arrayBuffer = await bunker(sample)
// fs.writeFileSync('output.sync.bunker', new Uint8Array(arrayBuffer))
// console.timeEnd("Bunker file Sync")

// console.log('\n------- WRITING DATA -------')
// console.time("Bunker")
// let arrayBuffer = await bunker(sample)
// console.timeEnd("Bunker")

// console.log('\n------- WRITING ARRAY OF DATA -------')
// console.time("bunker.toArrayOfBuffers")
// bunker.toArrayOfBuffers(sample)
// console.timeEnd("bunker.toArrayOfBuffers")


console.log('\n------- WRITING FILE FROM ARRAY OF DATA -------')
console.time("bunker file from array of data")
let array = bunker.toArrayOfBuffers(sample)
console.log(array)
let file = await fs.promises.open('output.array.bunker', 'w')
await file.writev(array)
await file.close()
console.timeEnd("bunker file from array of data")



// console.log('\n------- WRITING JSON FILE ASYNC -------')
// console.time("JSON file async")
// console.time("Transforming data")
// let string = JSON.stringify(hugeObject)
// console.timeEnd("Transforming data")
// fs.writeFile('output.async.json', string, () => console.timeEnd("JSON file async"))


// console.log('\n------- WRITING FILE STREAM -------')
// console.time("Bunker file Sync")
// let stream = fs.createWriteStream('output.stream.bunker')
// stream.on('finish', () => console.timeEnd("Bunker file Sync"))
// // stream.on('close', () => console.timeEnd("Bunker file Sync"))
// bunker.toStream(sample, stream)
// stream.end()


// console.log('\n------- WRITING FILE 2 -------')
// console.time("Bunker file 2")
// await bunker(sample, 'output2.bunker')
// console.timeEnd("Bunker file 2")


// console.log('\n------- READING -------')
// console.time("Bunker")
// let object = debunker(arrayBuffer)
// console.timeEnd("Bunker")
