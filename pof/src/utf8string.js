const cache = {}
const encoder = new TextEncoder()
const decoder = new TextDecoder()

/**
 * Encode a string into a Uint8Array and memoize it so that the
 * same string won't be encoded twice.
 */
export function encode(string) {
	if (string in cache == false)
		cache[string] = encoder.encode(string)
	return cache[string]
}

export function decode(uint8Array, begin = 0, end = uint8Array.length) {
	return decoder.decode(uint8Array.subarray(begin, end))
}

export function cleanCache() {
	for (let key in cache)
		delete cache[key]
}

export { cache }
