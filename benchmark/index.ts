import {
	guessSchema,
	bunker,
	bunkerSchema,
	debunker,
	debunkerSchema
} from '../src'
import { formatSize, formatTime } from './formatters'
import Table from 'cli-table'
// import zlib from 'zlib'
// import { inflate, deflate } from 'pako'
import * as msgpack from '@msgpack/msgpack'
import notepack from 'notepack.io'
import { performance } from 'perf_hooks'
import Schema from '../src/Schema'

import samples from '../samples'


const challengers = {
	'json': (value: any) => Buffer.from(JSON.stringify(value)),
	'bunker': (value: any) => bunker(value),
	'bunker (lazy guessing)': (value: any) => bunker(value, 'lazy'),
	'bunker (with schema)': (value: any, schema: Schema) => bunker(value, schema),
	'notepack': (value: any) => notepack.encode(value),
	'msgpack': (value: any) => notepack.encode(value),
}

const inputs = []
for (const [sample, value] of Object.entries(samples)) {
	const name = sample.replace(/\.[^/.]+$/, "")
	inputs.push([name, [value, guessSchema(value)]])
}

const results = {}
for (const [trial, input] of inputs) {
	for (const [challenger, fn] of Object.entries(challengers)) {
		const start = performance.now()
		let operations = 0
		let time = start
		do {
			fn.apply(input)
			operations++
			time = performance.now()
		} while (time < start + 500 && operations < 10)
		const operationsPerSecond = operations / (time - start) * 1000
		if (!results[trial]) results[trial] = {}
		results[trial][challenger] = operationsPerSecond
	}

}




// for (const [sample, value] of Object.entries(samples)) {
// 	const name = sample.replace(/\.[^/.]+$/, "")
// 	suite.addInput(name, [value, guessSchema(value)])
// }

/*
const results = {}
const challengers = {
	json: [
		(value: any) => Buffer.from(JSON.stringify(value)),
		// (value: Buffer) => JSON.parse(value.toString())
	],
	bunker: [ bunker ],
	notepack: [ notepack.encode ],
	msgpack: [ msgpack.encode ],
}


// challengers start the fight
for (const [challenger, [encode]] of Object.entries(challengers)) {
	for (const [sample, value] of Object.entries(samples)) {
		// const schema = guessSchema(value)
		const start = performance.now()
		const encoded = encode(value, 'lazy')
		const time = performance.now() - start
		if (!results[challenger]) results[challenger] = {}
		results[challenger][sample] = { time, size: encoded.length }
	}
}
*/


// now let's display results
const sampleNames = Object.keys(samples).map(sample => sample.replace(/\.[^/.]+$/, ""))
const timeTable = new Table({
	head: ['SPEED', ...sampleNames],
})
const sizeTable = new Table({
	head: ['SIZE', ...sampleNames],
})
for (const challenger in results) {
	const timeRow = [challenger]
	const sizeRow = [challenger]
	for (const sample in results[challenger]) {
		const { time, size } = results[challenger][sample]
		timeRow.push(formatTime(time))
		sizeRow.push(formatSize(size))
	}
	timeTable.push(timeRow)
	sizeTable.push(sizeRow)
}

console.log(timeTable.toString())
console.log(sizeTable.toString())
