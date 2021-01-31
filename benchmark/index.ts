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

export type Comparison = {
	title?: string
	challengers: Record<string, (...args: any[]) => any>
	inputs: Record<string, any>
	sort?: (a: any, b: any) => boolean
	format?: (a: any) => string
	apply?: (a: any) => any
}

/**
 * Start a new comparison with the given data
 */
async function compare(comparison: Comparison) {
	let { title, challengers, inputs, sort, format, apply } = comparison
	sort ??= (a: number, b: number) => a < b
	const results: Record<string, Record<string, string>> = {}
	
	// we collect the results
	for (const trial in inputs) {
		let bestResult = undefined
		let bestChallenger = undefined

		for (const challenger in challengers) {
			let run = () => challengers[challenger].apply(null, inputs[trial])
			if (apply) run = apply.bind(null, run)
			const result = await run()
			if (bestResult === undefined || sort(bestResult, result)) {
				bestResult = result
				bestChallenger = challenger
			}
			if (!(trial in results)) results[trial] = {}
			results[trial][challenger] = (format || String)(result)
		}
		Object.defineProperty(results[trial], 'bestChallenger', {
			enumerable: false,
			value: bestChallenger,
		})
	}

	// we create the result table
	const table = new Table({
		head: [title || '', ...Object.keys(challengers)]
	})
	for (const trial in results) {
		const row = [trial.replace(/\.[^/.]+$/, "")]

		for (const challenger in results[trial]) {
			let result = results[trial][challenger]
			if (challenger == results[trial].bestChallenger)
				result = chalk.bold.green(result)
			row.push(result)
		}
		table.push(row)
	}
	
	console.log(table.toString())
}

/**
 * Execute a function repeatedly and return the number of operations per second
 */
async function benchmark(fn: Function, iterations = 500) {
	let operations = 0
	let start = performance.now()
	let time: number

	do {
		await fn()
		operations++
		time = performance.now()
	} while (operations < 500)
	
	return operations / (time - start) * 1000
}


const inputs = {}
for (const [sample, value] of Object.entries(samples)) {
	const name = sample.replace(/\.[^/.]+$/, "")
	inputs[name] = [value, guessSchema(value)]
}

compare({
	title: "Encoding speed",
	challengers: {
		'json': (value: any) => Buffer.from(JSON.stringify(value)),
		'bunker': (value: any) => bunker(value),
		'bunker (with schema)': (value: any, schema: Schema) => bunker(value, schema),
		'notepack': (value: any) => notepack.encode(value),
		'msgpack': (value: any) => msgpack.encode(value),
	},
	inputs,
	format: (value: number) => Intl.NumberFormat().format(~~value) + ' ops/s',
	apply: benchmark,
})