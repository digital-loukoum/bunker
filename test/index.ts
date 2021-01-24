import start from 'fartest'
import {
	bunker,
	debunker,
	guessSchema
} from '../src'

import sample from './sample'
// import samples from '../samples'

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

start(async function({stage, same}) {
	stage('Schema')
	const schema = guessSchema(sample) as any
	for (const key in schema) {
		same(schema[key], schemaShouldBe[key], `Bad schema for '${key}'`)
	}

	stage('bunker')
	const buffer = bunker(5)
	console.log(buffer)
})


