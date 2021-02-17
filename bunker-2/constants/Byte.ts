const Byte = {
	reference: 0xF8,  // used to indicate if the value is a reference to another value
	start: 0xFE,  // used to indicate the start of a value
	stop: 0xFF,  // used to indicate the end of an object definition in a schema
}
export default Byte
