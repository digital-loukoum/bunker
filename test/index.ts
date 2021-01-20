import {
	guessSchema,

	bunker,
	bunker2,
	bunker3,
	bunkerRaw,
	bunkerFile,
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
import {
	readdirSync,
	readFileSync,
} from 'fs'
import { basename } from 'path'
import { performance } from 'perf_hooks'


const samples = {}
const results = {}
const challengers = {
	json: [
		(value: any) => Buffer.from(JSON.stringify(value)),
		// (value: Buffer) => JSON.parse(value.toString())
	],
	bunker2: [ bunker2 ],
	// bunker: [ bunker ],
	// bunker3: [ bunker3 ],
	notepack: [ notepack.encode ],
	msgpack: [ msgpack.encode ],
}


// we load the samples from the test/samples directory
for (const file of readdirSync('test/samples')) {
	if (file.startsWith('.')) continue
	const content = readFileSync(`test/samples/${file}`, 'utf8')
	samples[basename(file)] = JSON.parse(content)
}

// challengers start the fight
for (const [challenger, [encode]] of Object.entries(challengers)) {
	for (const [sample, value] of Object.entries(samples)) {
		// const schema = guessSchema(value)
		const start = performance.now()
		const encoded = encode(value)
		const time = performance.now() - start
		if (!results[challenger]) results[challenger] = {}
		results[challenger][sample] = { time, size: encoded.length }
	}
}

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

