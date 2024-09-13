/**
 * This function calls String.fromCharCode with chunks.
 * String.fromCharCode crashes when handling 125_434 characters or more.
 */
export function stringFromCharCode(charCodes: number[], chunkSize = 65_536): string {
	let result = ""
	for (let i = 0; i < charCodes.length; i += chunkSize) {
		try {
			result += String.fromCharCode.apply(null, charCodes.slice(i, i + chunkSize))
		} catch (error) {
			// we're still overflowing the stack, so we split the string in smaller chunks
			result += stringFromCharCode(charCodes.slice(i, i + chunkSize), chunkSize / 2)
		}
	}
	return result
}
