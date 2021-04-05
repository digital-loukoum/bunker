import start from "fartest"
import sample from "./sample"
import samples from "../samples"
import {
	bunker,
	debunker,
	schemaOf,
	record,
	nullable,
	integer,
	string,
	array,
	any,
	tuple,
	object,
} from "../src"
import { bunkerFile, debunkerFile } from "../src/io"
import { existsSync, mkdirSync, readFileSync } from "fs"

start(`Bunker i/o `, async function ({ stage, same }) {
	if (!existsSync(`test/output`)) mkdirSync(`test/output`)

	stage("Just a number")
	{
		const file = `test/output/number.bunker`
		const value = 12
		await bunkerFile(file, value)
		const decoded = debunker(readFileSync(file))
		same(value, decoded, "i/o writing")
		const devalue = await debunkerFile(file)
		same(value, devalue, "i/o reading")
	}

	stage("I/O samples")
	for (const sample in samples) {
		const value = samples[sample]
		const file = `test/output/${sample}.bunker`
		await bunkerFile(file, value)
		same(value, await debunkerFile(file), sample)
	}
})

start(`Bunker`, function Bunker({ stage, same }) {
	try {
		stage("Sample")
		{
			const data = bunker(sample)
			same(sample, debunker(data), "Sample")
		}

		stage("Random samples")
		try {
			for (const sample in samples) {
				const value = samples[sample]
				const data = bunker(value)
				same(value, debunker(data), sample)
			}
		} catch (error) {
			console.error(error)
		}

		stage("Numbers")
		for (const [name, value] of Object.entries({
			"Max safe integer": Number.MAX_SAFE_INTEGER,
			"Min safe integer": -Number.MAX_SAFE_INTEGER,
			Infinity: Infinity,
			"-Infinity": Infinity,
			"Negative value": -6546,
			Zero: 0,
			"Negative zero": -0,
			One: 1,
			"Negative one": -1,
			"Random positive integer": 7826348,
			"Random negative integer": -98712,
			BigInt: BigInt("1287236482634982736482736498726987632487"),
			Float: 123.32424,
			"Negative float": -1.23456789,
		})) {
			const buffer = bunker(value)
			const result = debunker(buffer)
			same(value, result, name)
		}

		stage("bunker.number")
		for (const [name, value] of Object.entries({
			"Max safe integer": Number.MAX_SAFE_INTEGER,
			"Min safe integer": -Number.MAX_SAFE_INTEGER,
			zero: 0,
			smallInteger: 9,
			mediumInteger: 348,
			bigInteger: 1234567890,
			number: 0.0123456789,
			exponentialNumber: 123e44,
			infinity: Infinity,
			nan: NaN,
			"minus-zero": -0,
			"minus-smallInteger": -9,
			"minus-mediumInteger": -348,
			"minus-bigInteger": -1234567890,
			"minus-number": -0.0123456789,
			"minus-exponentialNumber": -123e44,
			"minus-infinity": Infinity,
		})) {
			const buffer = bunker(value, bunker.number)
			const result = debunker(buffer)
			same(value, result, name)
		}

		stage("bunker.integer32/64")
		for (const encoder of [bunker.integer32, bunker.integer64]) {
			for (const [name, value] of Object.entries({
				zero: 0,
				smallInteger: 9,
				mediumInteger: 348,
				bigInteger: 1234567890,
				"minus-smallInteger": -9,
				"minus-mediumInteger": -348,
				"minus-bigInteger": -1234567890,
			})) {
				const buffer = bunker(value, encoder)
				const result = debunker(buffer)
				same(value, result, (encoder == bunker.integer32 ? "[32] " : "[64] ") + name)
			}
		}

		stage("Strings")
		for (const [name, value] of Object.entries({
			Foo: "foo",
			Bar: "bar",
			"Empty string": "",
			"Very large string":
				"jqhfhqksjhdfgkzjqshdkfjhgcqzkbjefghbquhsdfg vbksjdhcfnkqizefhgkqjchssgdncjsdf",
			"String with special values": "@&!éà'è&àçé'è!(§çé",
		})) {
			const buffer = bunker(value)
			const result = debunker(buffer)
			same(value, result, name)
		}

		stage("Objects")
		for (const [name, value] of Object.entries({
			"Standard object": { x: 12, y: 121 },
			Nested: { x: { y: { z: "foo" } }, t: "bar" },
		})) {
			const buffer = bunker(value)
			const result = debunker(buffer)
			same(value, result, name)
		}

		stage("Arrays")
		for (const [name, value] of Object.entries({
			"Array of objects": [
				{ x: 1, y: 2 },
				{ x: 10, y: 20 },
			],
		})) {
			const buffer = bunker(value)
			const result = debunker(buffer)
			same(value, result, name)
		}

		stage("Sets")
		for (const [name, value] of Object.entries({
			"Set of numbers": new Set([1, 2, 3, 4, 5, 6]),
			"Set of strings": new Set(["banana", "orange", "apple"]),
			"Set of mixed type": new Set(["banana", 12, "apple"]),
			"Set of nullable": new Set(["banana", null, "apple", null, undefined]),
		})) {
			const buffer = bunker(value)
			const result = debunker(buffer)
			same(value, result, name)
		}

		stage("Maps")
		for (const [name, value] of Object.entries({
			"Standard map": new Map([
				["x", 12],
				["y", 121],
			]),
		})) {
			const buffer = bunker(value)
			const result = debunker(buffer)
			same(value, result, name)
		}

		stage("Records")
		{
			const value = { x: 1, y: 2, z: 3 }
			const buffer = bunker(value, record(integer))
			const result = debunker(buffer)
			same(value, result, "Record of numbers")
		}
		{
			const value = { x: "1", y: "2", z: "3" }
			const buffer = bunker(value, record(string))
			const result = debunker(buffer)
			same(value, result, "Record of strings")
		}
		{
			const value = { x: "1", y: null, z: "3" }
			const buffer = bunker(value, record(nullable(string)))
			const result = debunker(buffer)
			same(value, result, "Record of nullable strings")
		}

		stage("References")
		{
			const o = { x: 12, y: 11 }
			const c = {} as any
			c.c = c
			for (const [name, value] of Object.entries({
				"Reference in object": { a: o, b: o },
				"Reference in array": [o, o],
				"Reference in set": { o, set: new Set([o, { x: 14 }]) },
				"Circular reference": c,
			})) {
				const buffer = bunker(value)
				// console.log("encoded", buffer)
				const result = debunker(buffer)
				if (!same(value, result, name)) {
					console.log(`------ ${name} ------`)
					console.log("buffer", buffer)
					console.log("input", value)
					console.log("output", result)
					console.log("------------\n")
				}
			}
		}

		stage("Tuples")
		{
			const value = {
				tuple: ["Hercule", 121],
				array: ["Hercule", 121],
				arrayOfTuples: [
					["Foo", 1],
					["Bar", 2],
					["Zabu", 12],
				],
			}
			const schema = object({
				tuple: tuple(string, integer),
				array: array(any),
				arrayOfTuples: array(tuple(string, integer)),
			})
			const buffer = bunker(value, schema)
			const result = debunker(buffer)
			same(value, result, "Basic tuple test")
		}

		stage("Instances")
		{
			class Zabu {
				constructor(public name = "Zabu") {}
				zabu() {
					return this.name.toUpperCase() + "!!!"
				}
			}
			bunker.register(
				Zabu,
				bunker.object({
					name: bunker.string,
				})
			)
			const value = [new Zabu(), new Zabu("Coco")]
			const buffer = bunker(value)
			const result = debunker(buffer)
			same(value, result, "Basic instance test: same values")
			same(value[0].zabu(), result[0].zabu(), "Basic instance test: same prototype [0]")
			same(value[1].zabu(), result[1].zabu(), "Basic instance test: same prototype [1]")
		}
		{
			class NamedArray extends Array<number> {
				constructor(public name = "Zabu") {
					super()
				}
				getName() {
					return this.name
				}
			}
			bunker.register(
				NamedArray,
				bunker.array(bunker.integer, {
					name: bunker.string,
				})
			)
			const value = [new NamedArray(), new NamedArray("Coco")]
			value[0].push(4, 6, 2)
			const buffer = bunker(value)
			const result = debunker(buffer)
			same(value, result, "Basic instance test: same values")
			same(
				value[0].getName(),
				result[0].getName(),
				"Array instance test: same prototype [0]"
			)
			same(
				value[1].getName(),
				result[1].getName(),
				"Array instance test: same prototype [1]"
			)
			same(value[0], result[0], "Array instance test: same array values")
		}
	} catch (error) {
		console.error(error)
		throw error
	}
})

start(`Precompiled`, function BunkerCompile({ stage, same }) {
	const value = sample
	const { encode, decode } = bunker.compile(schemaOf(sample))

	stage("Precompile (with reference)")
	{
		const data = encode(value)
		const decoded = decode(data)
		same(value, decoded)
	}

	stage("Multiple runs (with reference)")
	{
		let iterations = 5
		while (iterations--) {
			const data = encode(value)
			const decoded = decode(data)
			same(value, decoded)
		}
	}
})
