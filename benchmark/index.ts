import {
	guessSchema,
	bunker,
	debunker,
} from '../src'
import { bunker as bunker3, debunker as debunker3, guessSchema as guessSchema3 } from '../bunker • 3'
import Table from 'cli-table'
// import zlib from 'zlib'
// import { inflate, deflate } from 'pako'
import * as msgpack from '@msgpack/msgpack'
import notepack from 'notepack.io'
import { performance } from 'perf_hooks'
import Schema from '../src/Schema'
import chalk from 'chalk'
import { deflate, unzip as inflate } from 'zlib'
import { promisify } from 'util'
const zip = promisify(deflate)
const unzip = promisify(inflate)

import samples from '../samples'

export type Comparison = {
	title?: string
	inputs: Record<string, any>
	challengers: Record<string, (...args: any[]) => any>
	sort?: (a: number, b: number) => boolean
	format?: (a: any) => string
	apply?: (a: any) => any
}

/**
 * Start a new comparison with the given data
 */
async function compare(comparison: Comparison) {
	let { title, challengers, inputs, sort, format, apply } = comparison
	sort ??= (a: number, b: number) => a < b
	const results: Record<string, Record<string, number> & { bestChallenger?: string }> = {}
	
	// we collect the results
	for (const trial in inputs) {
		results[trial] = {}
		let bestResult = undefined
		let bestChallenger = undefined

		for (const challenger in challengers) {
			let run = () => challengers[challenger](inputs[trial])
			if (apply) run = apply.bind(null, run)
			const result = await run()
			if (bestResult === undefined || sort(bestResult, result)) {
				bestResult = result
				bestChallenger = challenger
			}
			results[trial][challenger] = result
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
			let result = (format || String)(results[trial][challenger])
			if (challenger == results[trial].bestChallenger)
				result = chalk.bold.green(result)
			row.push(result)
		}
		table.push(row)
	}

	// we add the average row
	{
		const averageRow = [chalk.bold.blue('Average')]
		const trialsCount = Object.keys(results).length
		const format = (value: number) => chalk.bold((value >= 0 ? '+' : '') + Intl.NumberFormat().format(~~(value * 100)) + '%')
		let bestChallengerIndex = 0
		let challengerIndex = 1
		let bestAverage = 0
		let firstChallenger: undefined | string = undefined

		for (const challenger in challengers) {
			if (firstChallenger === undefined) {
				firstChallenger = challenger
				averageRow.push(format(0))
				continue
			}

			let sum = 0
			for (const trial in results) {
				const ratio = results[trial][challenger] / results[trial][firstChallenger]
				sum += ratio >= 1 ? ratio - 1 : -1 / ratio + 1
			}
			const average = sum / trialsCount
			if (sort(bestAverage, average)) {
				bestAverage = average
				bestChallengerIndex = challengerIndex
			}
			averageRow.push(format(average))
			challengerIndex++
		}

		averageRow[bestChallengerIndex + 1] = chalk.bold.green(averageRow[bestChallengerIndex + 1])
		table.push(averageRow)
	}
	
	console.log(table.toString())
}

/**
 * Execute a function repeatedly and return the number of operations per second
 */
async function benchmark(fn: Function, iterations = 10000) {
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

+async function() {
	const inputs = {}
	for (const [sample, value] of Object.entries(samples)) {
		const name = sample.replace(/\.[^/.]+$/, "")
		inputs[name] = [value, guessSchema(value), bunker3.compile(guessSchema3(value)), guessSchema3(value)]
	}
	
	const encoders = {
		'json': ([value]: any) => Buffer.from(JSON.stringify(value)),
		'zipped json': async ([value]: any) => await zip(Buffer.from(JSON.stringify(value))),
		'bunker': ([value]: any) => bunker(value),
		'bunker•3': ([value]: any) => bunker3(value),
		'msgpack': ([value]: any) => msgpack.encode(value),
		'notepack': ([value]: any) => notepack.encode(value),
	}
	
	const encoded = {}
	for (const trial in inputs) {
		encoded[trial] = {}
		for (const encoder in encoders) {
			encoded[trial][encoder] = [await encoders[encoder](inputs[trial]), inputs[trial][2].decode]
		}
	}
	// console.log("Encoded", encoded)
	
	compare({
		title: "Output size",
		inputs,
		challengers: encoders,
		apply: async (run: Function) => (await run()).length,
		format: (value: number) => Intl.NumberFormat().format(value) + ' o',
		sort: (a, b) => a > b,
	})

	
	compare({
		title: "Encoding speed",
		inputs,
		challengers: {
			'json': ([value]: any) => Buffer.from(JSON.stringify(value)),
			'zipped json': async ([value]: any) => await zip(Buffer.from(JSON.stringify(value))),
			'bunker': ([value]: any) => bunker(value),
			'bunker (with schema)': ([value, schema]: [any, Schema]) => bunker(value, schema),
			'bunker•3': ([value]: any) => bunker3(value),
			'bunker•3 (with schema)': ([value, , , schema]: any) => bunker3(value, schema),
			'bunker•3 (compiled)': ([value, , compiled]: any) => compiled.encode(value),
			'notepack': ([value]: any) => notepack.encode(value),
			'msgpack': ([value]: any) => msgpack.encode(value),
		},
		format: (value: number) => Intl.NumberFormat().format(~~value) + ' ops/s',
		apply: benchmark,
	})

	compare({
		title: "Decoding speed",
		inputs: encoded,
		challengers: {
			'json': (encoded: any) => JSON.parse(encoded.json[0].toString()),
			'zipped json': async (encoded: any) => JSON.parse((await unzip(encoded['zipped json'][0])).toString()),
			'bunker': (encoded: any) => debunker(encoded.bunker[0]),
			'bunker•3 (compiled)': (encoded: any) => encoded['bunker•3'][1](encoded['bunker•3'][0]),
			'bunker•3': (encoded: any) => debunker3(encoded['bunker•3'][0]),
			'notepack': (encoded: any) => notepack.decode(encoded.notepack[0]),
			'msgpack': (encoded: any) => msgpack.decode(encoded.msgpack[0]),
		},
		format: (value: number) => Intl.NumberFormat().format(~~value) + ' ops/s',
		apply: benchmark,
	})
}()
