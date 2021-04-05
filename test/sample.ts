const o = { foo: 0, bar: 1 }

export default new (class {
	zero = 0
	negativeZero = -0
	one = 1
	references = { o, alias: o }
	arrayOfIntegers = [1, 2, 3, 4, 5]
	arrayOfNullableIntegers = [1, null, 3, undefined, 5, null, null]
	arrayOfArrayOfIntegers = [
		[5, 6],
		[32, 33],
		[78, 88],
	]
	arrayOfStrings = ["Hercule", "Coco"]
	undefined = undefined
	null = null
	true = true
	false = false
	date = new Date()
	infinity = Infinity
	"-Infinity" = -Infinity
	nan = NaN
	regexp = /zabu|coco/gi
	string = "Hey my friends"
	int = 123456789
	setOfIntegers = new Set([5, 10, 15, 20, 25])
	setOfStrings = new Set(["5", "10", "15", "20", "25"])
	setOfAny = new Set(["string", 12])
	setOfObjects = new Set([
		{ x: 12, y: "Hello" },
		{ x: 121, y: " world" },
	])

	map = new Map([
		["1", "one"],
		["2", "two"],
		["3", "three"],
	])
	mapOfObjects = new Map([
		["zabu", { x: 12, y: "Hello" }],
		["coco", { x: 121, y: 12 }],
	])

	arrayWithProperties = Object.assign([5, 9, 232], {
		name: "Calculus",
		working: true,
	})

	nested = {
		name: "Zabu",
		strength: 12,
	}
})()
