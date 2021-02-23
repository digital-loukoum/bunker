enum Byte {
	// primitives
	unknown = 0,
	character,
	binary,
	boolean,
	integer,
	positiveInteger,
	bigInteger,
	number,
	string,
	regularExpression,
	date,
	any,

	// composed
	nullable,
	tuple,
	
	// objects
	object,
	array,
	set,
	record,
	map,

	// special bytes
	reference = 0xF8,  // used to indicate if the value is a reference to a previously encountered object
	stringReference = 0xF9,  // used to indicate if the value is a reference to a previously encountered string
	start = 0xFE,  // used to indicate the start of a value
	stop = 0xFF,  // used to indicate the end of an object definition in a schema

	// nullable values
	null = 0,
	undefined = 1,
	defined = 2,
}

export default Byte