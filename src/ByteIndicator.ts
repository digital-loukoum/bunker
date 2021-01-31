enum ByteIndicator {
	null = 0,
	undefined,
	defined,
	object,
	stringReference = 0xF8,
	stop = 255,
}

export default ByteIndicator
