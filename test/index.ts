import start from 'fartest'
import {
	bunker,
	debunker,
	guessSchema
} from '../src'
import {
	bunkerFile,
	bunkerFile2,
	debunkerFile,
} from '../src/node'
import { ObjectRecord, Nullable } from '../src/Schema'
import Type from '../src/Type'

import sample from './sample'
import samples from '../samples'

const schemaShouldBe = {
	zero: 5,
	negativeZero: 5,
	one: 5,
	arrayOfIntegers: [ 5 ],
	arrayOfNullableIntegers: [ { type: 5 } ],
	arrayOfArrayOfIntegers: [ [ 5 ] ],
	arrayOfStrings: [ 9 ],
	undefined: 1,
	null: 1,
	true: 3,
	false: 3,
	date: 11,
	infinity: 8,
	'-Infinity': 8,
	nan: 8,
	regexp: 10,
	string: 9,
	int: 5,
	setOfIntegers: new Set([5]),
	setOfStrings: new Set([9]),
	setOfAny: new Set([2]),
	setOfObjects: new Set([{ x: 5, y: 9 }]),
	mapRecord: { type: 9, keys: [ 1, 2, 3 ] },
	mapRecordOfObjects: { type: { x: 5, y: 2 }, keys: [ 'zabu', 'coco' ] },
	mapAsObject: new Map([['name', 9], ['strength', 5 ]]),
	arrayWithProperties: [ 5, { name: 9, working: 3 } ],
	nested: { name: 9, strength: 5 }
}


start("Bunker node API", async function({stage, same}) {
	stage("Write file using standard buffer")
	for (const [name, value] of Object.entries(samples)) {
		const filename = `test/output/${name}`
		await bunkerFile(filename, value)
		const result = await debunkerFile(filename)
		same(value, result, name)
	}

	stage("Write file using double-buffering")
	for (const [name, value] of Object.entries(samples)) {
		const filename = `test/output/(doubleBuffering) ${name}`
		await bunkerFile2(filename, value)
		const result = await debunkerFile(filename)
		same(value, result, name)
	}
})


start("Bunker", async function({stage, same}) {
	stage('Schema')
	const schema = guessSchema(sample) as any
	for (const key in schema) {
		same(schema[key], schemaShouldBe[key], `Bad schema for '${key}'`)
	}

	stage('Numbers')
	for (const [name, value] of Object.entries({
		"Max safe integer": Number.MAX_SAFE_INTEGER,
		"Min safe integer": -Number.MAX_SAFE_INTEGER,
		"Infinity": Infinity,
		"-Infinity": Infinity,
		"Negative value": -6546,
		"Zero": 0,
		"Negative zero": -0,
		"One": 1,
		"Negative one": -1,
		"Random positive integer": 7826348,
		"Random negative integer": -98712,
		"BigInt": BigInt("1287236482634982736482736498726987632487"),
		"Float": 123.32424,
		"Negative float": -1.23456789,
	})) {
		const buffer = bunker(value)
		const result = debunker(buffer)
		same(value, result, name)
	}

	stage('Strings')
	for (const [name, value] of Object.entries({
		"Foo": "foo",
		"Bar": "bar",
		"Empty string": "",
		"Very large string": "jqhfhqksjhdfgkzjqshdkfjhgcqzkbjefghbquhsdfg vbksjdhcfnkqizefhgkqjchssgdncjsdf",
		"String with special values": "@&!éà'è&àçé'è!(§çé",
	})) {
		const buffer = bunker(value)
		const result = debunker(buffer)
		same(value, result, name)
	}

	stage('Objects')
	for (const [name, value] of Object.entries({
		"Standard object": { x: 12, y: 121},
		"Nested": { x: { y: { z: "foo" } }, t: "bar" },
	})) {
		const buffer = bunker(value)
		const result = debunker(buffer)
		same(value, result, name)
	}

	stage('Arrays')
	for (const [name, value] of Object.entries({
		"Array of objects": [{ x: 1, y: 2}, { x: 10, y: 20}],
	})) {
		const buffer = bunker(value)
		const result = debunker(buffer)
		same(value, result, name)
	}

	stage('Sets')
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

	stage('Maps')
	for (const [name, value] of Object.entries({
		"Standard map": new Map([ ["x", 12], ["y", 121]]),
	})) {
		const buffer = bunker(value)
		const result = debunker(buffer)
		same(value, result, name)
	}

	stage('Records')
	{
		const value = {x: 1, y: 2, z: 3}
		const buffer = bunker(value, new ObjectRecord(Type.Integer))
		const result = debunker(buffer)
		same(value, result, "Record of numbers")
	}
	{
		const value = {x: "1", y: "2", z: "3"}
		const buffer = bunker(value, new ObjectRecord(Type.String))
		const result = debunker(buffer)
		same(value, result, "Record of strings")
	}
	{
		const value = {x: "1", y: null, z: "3"}
		const buffer = bunker(value, new ObjectRecord(Nullable(Type.String)))
		const result = debunker(buffer)
		same(value, result, "Record of nullable strings")
	}

	stage('References')
	{
		const o = { x: 12, y: 11 }
		const a = [1, 2, 3, 4]
		for (const [name, value] of Object.entries({
			"Reference in object": {a: o, b: o},
			"Reference in array": [o, {x: 13}, o],
			"Reference in set": new Set([o, o, o, {x: 14}, o])
		})) {
			const buffer = bunker(value)
			const result = debunker(buffer)
			same(value, result, name)
		}
	}


	// stage('Samples')
	// for (const [name, value] of Object.entries(samples)) {
	// 	const buffer = bunker(value)
	// 	const result = debunker(buffer)
	// 	same(value, result, name)
	// }
})

