import start from 'fartest'
import { bunker, debunker, createSchema, Type } from '../bunker-2'
import samples from '../samples'


start("Bunker • 2", async function({stage, same}) {
	// stage('Numbers')
	// for (const [name, value] of Object.entries({
	// 	"Max safe integer": Number.MAX_SAFE_INTEGER,
	// 	"Min safe integer": -Number.MAX_SAFE_INTEGER,
	// 	"Infinity": Infinity,
	// 	"-Infinity": Infinity,
	// 	"Negative value": -6546,
	// 	"Zero": 0,
	// 	"Negative zero": -0,
	// 	"One": 1,
	// 	"Negative one": -1,
	// 	"Random positive integer": 7826348,
	// 	"Random negative integer": -98712,
	// 	"BigInt": BigInt("1287236482634982736482736498726987632487"),
	// 	"Float": 123.32424,
	// 	"Negative float": -1.23456789,
	// })) {
	// 	const buffer = bunker(value)
	// 	const result = debunker(buffer)
	// 	same(value, result, name)
	// }

	// stage('Strings')
	// for (const [name, value] of Object.entries({
	// 	"Foo": "foo",
	// 	"Bar": "bar",
	// 	"Empty string": "",
	// 	"Very large string": "jqhfhqksjhdfgkzjqshdkfjhgcqzkbjefghbquhsdfg vbksjdhcfnkqizefhgkqjchssgdncjsdf",
	// 	"String with special values": "@&!éà'è&àçé'è!(§çé",
	// })) {
	// 	const buffer = bunker(value)
	// 	const result = debunker(buffer)
	// 	same(value, result, name)
	// }

	// stage('Objects')
	// for (const [name, value] of Object.entries({
	// 	"Standard object": { x: 12, y: 121},
	// 	"Nested": { x: { y: { z: "foo" } }, t: "bar" },
	// })) {
	// 	const buffer = bunker(value)
	// 	const result = debunker(buffer)
	// 	same(value, result, name)
	// }

	// stage('Arrays')
	// for (const [name, value] of Object.entries({
	// 	"Array of objects": [{ x: 1, y: 2}, { x: 10, y: 20}],
	// })) {
	// 	const buffer = bunker(value)
	// 	const result = debunker(buffer)
	// 	same(value, result, name)
	// }

	// stage('Sets')
	// for (const [name, value] of Object.entries({
	// 	"Set of numbers": new Set([1, 2, 3, 4, 5, 6]),
	// 	"Set of strings": new Set(["banana", "orange", "apple"]),
	// 	"Set of mixed type": new Set(["banana", 12, "apple"]),
	// 	"Set of nullable": new Set(["banana", null, "apple", null, undefined]),
	// })) {
	// 	const buffer = bunker(value)
	// 	const result = debunker(buffer)
	// 	same(value, result, name)
	// }

	// stage('Maps')
	// for (const [name, value] of Object.entries({
	// 	"Standard map": new Map([ ["x", 12], ["y", 121]]),
	// })) {
	// 	const buffer = bunker(value)
	// 	const result = debunker(buffer)
	// 	same(value, result, name)
	// }

	// stage('Records')
	// {
	// 	const value = {x: 1, y: 2, z: 3}
	// 	const buffer = bunker(value, Type.record(Type.integer))
	// 	const result = debunker(buffer)
	// 	same(value, result, "Record of numbers")
	// }
	// {
	// 	const value = {x: "1", y: "2", z: "3"}
	// 	const buffer = bunker(value, Type.record(Type.string))
	// 	const result = debunker(buffer)
	// 	same(value, result, "Record of strings")
	// }
	// {
	// 	const value = {x: "1", y: null, z: "3"}
	// 	const buffer = bunker(value, Type.record(Type.nullable(Type.string)))
	// 	const result = debunker(buffer)
	// 	same(value, result, "Record of nullable strings")
	// }

	stage('References')
	{
		const o = { x: 12, y: 11 }
		const c = {} as any
		c.self = c
		for (const [name, value] of Object.entries({
			"Reference in object": {a: o, b: o},
			// "Reference in array": [o, {x: 13}, o],
			// "Reference in set": { o, set: new Set([o, {x: 14}]) },
			// "Circular reference": c,
		})) {
			console.log('[BUNKER]')
			const buffer = bunker(value)
			console.log('[DEBUNKER]')
			const result = debunker(buffer)
			if (!same(value, result, name)) {
				console.log(`------ ${name} ------`)
				console.log("buffer", buffer)
				console.log("input", value)
				console.log("output", result)
				console.log('------------\n')
			}
		}
	}

	// stage('Tuples')
	// {
	// 	const value = {
	// 		tuple: ["Hercule", 121],
	// 		array: ["Hercule", 121],
	// 		arrayOfTuples: [
	// 			["Foo", 1],
	// 			["Bar", 2],
	// 			["Zabu", 12],
	// 		]
	// 	}
	// 	const schema = createSchema(({string, integer, array, any}) => ({
	// 		tuple: [string, integer],
	// 		array: array(any),
	// 		arrayOfTuples: array([string, integer]),
	// 	}))
	// 	const buffer = bunker(value, schema)
	// 	const result = debunker(buffer)
	// 	same(value, result, "Basic tuple test")
	// }

	// stage('Samples')
	// for (const [name, value] of Object.entries(samples)) {
	// 	const buffer = bunker(value)
	// 	const result = debunker(buffer)
	// 	same(value, result, name)
	// }
})
