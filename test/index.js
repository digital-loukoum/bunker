
import { bunker, sizeofBunker } from '../src/bunker.js'

import sample from './samples/sample.js'

// let size = sizeofBunker(sample)
// console.log(size)

let arrayBuffer = bunker(sample)
console.log(arrayBuffer)
