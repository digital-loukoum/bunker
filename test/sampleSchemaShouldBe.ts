import {
	nullable,
	arrayOf,
	setOf,
	mapOf,
	integer,
	string,
	any,
	date,
	boolean,
	nil,
	number,
	regExp,
	referenceTo,
} from '../src/Schema'

const o = {
	foo: string,
	bar: string
}

export default {
	zero: integer,
	negativeZero: integer,
	one: integer,
	references: {
		o,
		alias: referenceTo(o),
	},
	arrayOfIntegers: arrayOf(integer),
	arrayOfNullableIntegers: arrayOf(nullable(integer)),
	arrayOfArrayOfIntegers: arrayOf(arrayOf(integer)),
	arrayOfStrings: arrayOf(string),
	undefined: nil,
	null: nil,
	true: boolean,
	false: boolean,
	date,
	infinity: number,
	'-Infinity': number,
	nan: number,
	regexp: regExp,
	string: string,
	int: integer,
	setOfIntegers: setOf(integer),
	setOfStrings: setOf(string),
	setOfAny: setOf(any),
	setOfObjects: setOf({ x: integer, y: string }),
	map: mapOf(string),
	mapOfObjects: mapOf({x: integer, y: any}),
	arrayWithProperties: arrayOf(integer, { name: string, working: boolean }),
	nested: { name: string, strength: integer }
}

