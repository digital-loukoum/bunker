import {
	guessSchema,
	bunker,
	bunkerSchema,
	debunker,
	debunkerSchema
} from '../src'
import {
	bunkerFile,
} from '../src/node'
import { formatSize, formatTime } from './formatters'
import Table from 'cli-table'
// import zlib from 'zlib'
// import { inflate, deflate } from 'pako'
import * as msgpack from '@msgpack/msgpack'
import notepack from 'notepack.io'
import { performance } from 'perf_hooks'
import Schema from '../src/Schema'
import chalk from 'chalk'

import samples from '../samples'


async function benchmark() {
	const challengers = {
		'json': (value: any) => Buffer.from(JSON.stringify(value)),
		'bunker': (value: any) => bunker(value),
		'bunker (with schema)': (value: any, schema: Schema) => bunker(value, schema),
		'notepack': (value: any) => notepack.encode(value),
		'msgpack': (value: any) => msgpack.encode(value),
	}
	
	const inputs = []
	for (const [sample, value] of Object.entries(samples)) {
		const name = sample.replace(/\.[^/.]+$/, "")
		inputs.push([name, [value, guessSchema(value)]])
	}
	
	const results = {}
	for (const [trial, input] of inputs) {
		let fastestChallenger: string
		let fastestResult = -1
	
		for (const [challenger, fn] of Object.entries(challengers)) {
			let operations = 0
			let start = performance.now()
			let time: number
	
			do {
				await fn.apply(null, input)
				operations++
				time = performance.now()
			} while (operations < 500)
			
			const operationsPerSecond = operations / (time - start) * 1000
			
			if (!results[trial]) results[trial] = {}
			results[trial][challenger] = operationsPerSecond
			
			if (operationsPerSecond > fastestResult) {
				fastestChallenger = challenger
				fastestResult = operationsPerSecond
			}
		}
		results[trial].fastest = fastestChallenger
	}
	
	
	
	// now let's display results
	const timeTable = new Table({
		head: ['SPEED', ...Object.keys(challengers)],
	})
	// const sizeTable = new Table({
	// 	head: ['SIZE', ...sampleNames],
	// })
	for (const trial in results) {
		const timeRow = [trial.replace(/\.[^/.]+$/, "")]
		for (const challenger in results[trial]) {
			if (challenger == 'fastest') continue
			let speed = results[trial][challenger]
			speed = Intl.NumberFormat().format(~~speed) + ' ops/s'
			if (challenger == results[trial].fastest)
				speed = chalk.bold.green(speed)
			timeRow.push(speed)
		}
		timeTable.push(timeRow)
	}
	
	console.log(timeTable.toString())
	// console.log(sizeTable.toString())
}

benchmark()
