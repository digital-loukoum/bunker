const CHUNK_SIZE = 120000

/**
 * This function calls String.fromCharCode with chunks.
 * String.fromCharCode crashes when handling 125434 characters or more.
 */
export function stringFromCharCode(charCodes: number[]): string {
	let result = ""
	for (let i = 0; i < charCodes.length; i += CHUNK_SIZE) {
		result += String.fromCharCode.apply(null, charCodes.slice(i, i + CHUNK_SIZE))
	}
	return result
}
