
import { bunker, debunker } from '../src/bunker.js'
import sample from './samples/sample.js'

// let size = sizeofBunker(sample)
// console.log(size)

console.log('\n------- WRITING -------')
let arrayBuffer = bunker(sample)
console.log(arrayBuffer)


console.log('\n------- READING -------')
let object = debunker(arrayBuffer)
console.log("Result :", object)