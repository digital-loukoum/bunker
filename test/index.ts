import { bunkerRawData, bunkerFile } from '../src'

import simpleObject from './samples/simple-object'

console.time("To raw data")
const rawData = bunkerRawData(simpleObject)
console.timeEnd("To raw data")
console.log(rawData)

console.time("To file")
bunkerFile('test/output/simple-object.bunker', simpleObject)
console.timeEnd("To file")
