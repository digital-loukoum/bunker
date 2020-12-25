import Bunker from '../src/Bunker2.js'
import sample from './samples/sample.js'
import { encode, decode } from "@msgpack/msgpack"

const { Integer, Boolean, Number, String } = Bunker

let bunker = Bunker(sample, {
	zero: Integer,
	one: Integer,
	true: Boolean,
	false: Boolean,
	infinity: Number,
	'-Infinity': Number,
	int: Integer,
	double: Number,
	string: String,
	// arrayOfIntegers: ArrayOf(Integer),
})

console.time('Json stringify')
let json = JSON.stringify(sample)
console.timeEnd('Json stringify')

console.time('Bunker save')
let buffers = bunker.save()
console.timeEnd('Bunker save')

console.time('MessagePack encode')
let message = encode(sample)
console.timeEnd('MessagePack encode')



console.log("Json size :", json.length)
console.log("Bunker size :", buffers.length)
console.log("Message size :", message.length)

// console.time('Json parse')
// let objectFromJson = JSON.parse(json)
// console.timeEnd('Json parse')


// console.time('Bunker load')
// let objectFromBunker = bunker.load(buffers)
// console.timeEnd('Bunker load')


// console.time('MessagePack decode')
// let objectFromMessagePack = decode(message)
// console.timeEnd('MessagePack decode')

// console.log('---------------')
// console.log(objectFromJson)
// console.log(objectFromBunker)
// console.log(objectFromMessagePack)
