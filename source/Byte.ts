enum Byte {
	// primitives
	unknown = 0,
	character,
	binary,
	uint8Array,
	uint16Array,
	uint32Array,
	uint8ClampedArray,
	int8Array,
	int16Array,
	int32Array,
	float32Array,
	float64Array,
	bigInt64Array,
	bigUint64Array,
	arrayBuffer,
	dataView,
	boolean,
	positiveInteger,
	integer,
	bigInteger,
	number,
	string,
	regularExpression,
	date,
	any,
	object, // ... objects
	array,
	set,
	map,
	nullable, // ... composed
	tuple,
	instance,
	recall,

	// special bytes
	reference = 0xf8, // used to indicate if the value is a reference to a previously encountered object
	stringReference = 0xf9, // used to indicate if the value is a reference to a previously encountered string
	start = 0xfe, // used to indicate the start of a value
	stop = 0xff, // used to indicate the end of an object definition in a schema

	// nullable values
	null = 0,
	undefined = 1,
	defined = 2,
}

export default Byte
