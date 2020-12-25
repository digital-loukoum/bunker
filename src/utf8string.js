const cache = {}
const encoder = new TextEncoder()

/**
 * Encode a string into a Uint8Array and memoize it so that the
 * same string won't be encoded twice.
 */
export default function (string) {
	if (string in cache == false)
		cache[string] = encoder.encode(string)
	return cache[string]
}
