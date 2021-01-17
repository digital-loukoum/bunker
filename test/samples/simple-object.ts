export default new class {
	zero = 0
	negativeZero = -0
	one = 1
	arrayOfIntegers = [[5, 6], [32, 33], [78, 88]]
	arrayOfStrings = ["Hercule", "Coco"]
	undefined = undefined
	null = null
	true = true
	false = false
	date = new Date
	infinity = Infinity
	'-Infinity' = -Infinity
	nan = NaN
	regexp = /zabu|coco/gi
	string = "Hey my friends"
	int = 123456789
	setOfIntegers = new Set([5, 10, 15, 20, 25])
	setOfStrings = new Set(["5", "10", "15", "20", "25"])
	setOfAny = new Set(['string', 12])
	setOfObjects = new Set([{x: 12, y: "Hello"}, {x: 121, y:" world"}])

	map = new Map([
		[1, 'one'],
		[2, 'two'],
		[3, 'three'],
	])
	mapOfObjects = new Map([
		["zabu", {x: 12, y: "Hello"}],
		["coco", {x: 121, y: 12}],
	])

	arrayWithProperties = Object.assign([5, 9, 232], {
		name: "Calculus",
		working: true,
	})
	// double = 5.97987

	deep = {
		name: "Zabu",
		strength: 12,
	}
	// arrayOfArrayOfIntegers = [[1, 3, 5], [2, 4, 6]]
	// arrayOfDoubles = [8.4, 8, 934.3476]
	// arrayOfStrings = ["Hey", "You", "How are you?"]
	// arrayOfAny = [5, "Zabu", ["Coco"]]

	// static schema = {
	// 	zero: Atom.Integer,
	// 	one: Atom.Integer,
	// }
}