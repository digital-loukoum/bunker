enum Type {
	// primitive types
	unknown = 0,
	any,
	boolean,
	character,
	integer,
	positiveInteger,
	bigInteger,
	number,
	string,
	regularExpression,
	date,
	reference,
	// non-primitive types
	nullable,
	object,
	array,
	set,
	tuple,
	record,
	map,
}

export default Type