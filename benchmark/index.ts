import { bunker, debunker, schemaOf } from "../source"
import Table from "cli-table"
// import zlib from 'zlib'
// import { inflate, deflate } from 'pako'
import * as msgpack from "@msgpack/msgpack"
import notepack from "notepack.io"
import { performance } from "perf_hooks"
import * as chalk from "chalk"
import { deflate, unzip as inflate } from "zlib"
import { promisify } from "util"
const zip = promisify(deflate)
const unzip = promisify(inflate)

import samples from "../samples"

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
	if (!sort) sort = (a: number, b: number) => a < b
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
		Object.defineProperty(results[trial], "bestChallenger", {
			enumerable: false,
			value: bestChallenger,
		})
	}

	// we create the result table
	const table = new Table({
		head: [title || "", ...Object.keys(challengers)],
	})
	for (const trial in results) {
		const row = [trial.replace(/\.[^/.]+$/, "")]

		for (const challenger in results[trial]) {
			let result = (format || String)(results[trial][challenger])
			if (challenger == results[trial].bestChallenger) result = chalk.bold.green(result)
			row.push(result)
		}
		table.push(row)
	}

	// we add the average row
	{
		const averageRow = [chalk.bold.blue("Average")]
		const trialsCount = Object.keys(results).length
		const format = (value: number) =>
			chalk.bold(
				(value >= 0 ? "+" : "") + Intl.NumberFormat().format(~~(value * 100)) + "%"
			)
		let bestChallengerIndex = 0
		let challengerIndex = 1
		let bestAverage = 0
		let firstChallenger: undefined | string = undefined

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

		averageRow[bestChallengerIndex + 1] = chalk.bold.green(
			averageRow[bestChallengerIndex + 1]
		)
		table.push(averageRow)
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

	while (operations++ < iterations) await fn()

	time = performance.now()
	return (operations / (time - start)) * 1000
}

;+(async function () {
	const inputs = {}
	for (const [sample, value] of Object.entries(samples)) {
		const name = sample.replace(/\.[^/.]+$/, "")
		inputs[name] = [value, schemaOf(value), bunker.compile(schemaOf(value))]
	}

	const encoders = {
		json: async ([value]: any) => Buffer.from(JSON.stringify(value)),
		// "zipped json": async ([value]: any) => await zip(Buffer.from(JSON.stringify(value))),
		bunker: async ([value]: any) => bunker(value),
		"bunker (naked)": async ([value]: any) =>
			bunker.compile(schemaOf(value)).encodeNaked(value),
		msgpack: async ([value]: any) => msgpack.encode(value),
		// notepack: async ([value]: any) => notepack.encode(value),
	}

	const encoded = {}
	for (const trial in inputs) {
		encoded[trial] = {}
		for (const encoder in encoders) {
			encoded[trial][encoder] = [
				await encoders[encoder](inputs[trial]),
				inputs[trial][2].decode,
				inputs[trial][2].decodeNaked,
			]
		}
	}

	compare({
		title: "Output size",
		inputs,
		challengers: encoders,
		apply: async (run: Function) => (await run()).length,
		format: (value: number) => Intl.NumberFormat().format(value) + " o",
		sort: (a, b) => a > b,
	})

	compare({
		title: "Decoding speed",
		inputs: encoded,
		challengers: {
			json: async (encoded: any) => JSON.parse(encoded.json[0].toString()),
			// "zipped json": async (encoded: any) =>
			// 	JSON.parse((await unzip(encoded["zipped json"][0])).toString()),
			bunker: async (encoded: any) => debunker(encoded["bunker"][0]),
			// "bunker (naked)": (encoded: any) =>
			// encoded["bunker"][2](encoded["bunker (naked)"][0]),
			"bunker (compiled)": async (encoded: any) =>
				encoded["bunker"][1](encoded["bunker"][0]),
			msgpack: async (encoded: any) => msgpack.decode(encoded.msgpack[0]),
			// notepack: async (encoded: any) => notepack.decode(encoded.notepack[0]),
		},
		format: (value: number) => Intl.NumberFormat().format(~~value) + " ops/s",
		apply: benchmark,
	})

	compare({
		title: "Encoding speed",
		inputs,
		challengers: {
			json: async ([value]: any) => Buffer.from(JSON.stringify(value)),
			// "zipped json": async ([value]: any) =>
			// 	await zip(Buffer.from(JSON.stringify(value))),
			bunker: async ([value]: any) => bunker(value),
			// 'bunker (with schema)': ([value, schema]: any) => bunker(value, schema),
			// "bunker (naked)": ([value, , compiled]: any) => compiled.encodeNaked(value),
			"bunker (compiled)": async ([value, , compiled]: any) => compiled.encode(value),
			msgpack: async ([value]: any) => msgpack.encode(value),
			// notepack: async ([value]: any) => notepack.encode(value),
		},
		format: (value: number) => Intl.NumberFormat().format(~~value) + " ops/s",
		apply: benchmark,
	})
})()
