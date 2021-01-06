const cache: { [key: string]: Uint8Array } = {}
const encoder = new TextEncoder()
const decoder = new TextDecoder()

/**
 * Encode a string into a Uint8Array and memoize it so that the
 * same string won't be encoded twice.
 */
export function encode(value: string) {
	if (value in cache == false)
		cache[value] = encoder.encode(value)
	return cache[value]
}

export function decode(uint8Array: Uint8Array, begin = 0, end = uint8Array.length) {
	return decoder.decode(uint8Array.subarray(begin, end))
}

export function cleanCache() {
	for (let key in cache)
		delete cache[key]
}

export { cache }
