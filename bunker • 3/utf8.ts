
const decodeStringChunkSize = 4096

/**
 * Encode a Javascript string into utf8 and write it 
 */
export function encodeString(value: string, bytes: Uint8Array, offset = 0) {
	const { length } = value
	let cursor = 0

	while (cursor < length) {
		let byte = value.charCodeAt(cursor++)

		if ((byte & 0xffffff80) === 0) {
			// 1-byte
			bytes[offset++] = byte
			continue
		}
		else if ((byte & 0xfffff800) === 0) {
			// 2-byte
			bytes[offset++] = ((byte >> 6) & 0x1f) | 0xc0
		}
		else {
			// handle surrogate pair
			if (byte >= 0xd800 && byte <= 0xdbff) {
				// high surrogate
				if (cursor < length) {
					const extra = value.charCodeAt(cursor)
					if ((extra & 0xfc00) === 0xdc00) {
						cursor++
						byte = ((byte & 0x3ff) << 10) + (extra & 0x3ff) + 0x10000
					}
				}
			}

			if ((byte & 0xffff0000) === 0) {
				// 3-byte
				bytes[offset++] = ((byte >> 12) & 0x0f) | 0xe0
				bytes[offset++] = ((byte >> 6) & 0x3f) | 0x80
			}
			else {
				// 4-byte
				bytes[offset++] = ((byte >> 18) & 0x07) | 0xf0
				bytes[offset++] = ((byte >> 12) & 0x3f) | 0x80
				bytes[offset++] = ((byte >> 6) & 0x3f) | 0x80
			}
		}

		bytes[offset++] = (byte & 0x3f) | 0x80
	}
}

export function decodeString(bytes: Uint8Array, offset: number): string {
	let result = ""
	const units: Array<number> = []
	let byte1, byte2, byte3, byte4

	while (byte1 = bytes[offset++]) {
		if ((byte1 & 0x80) === 0) {
			units.push(byte1)
		}
		else if ((byte1 & 0xe0) === 0xc0) {
			byte2 = bytes[offset++]! & 0x3f
			units.push(((byte1 & 0x1f) << 6) | byte2)
		}
		else if ((byte1 & 0xf0) === 0xe0) {
			byte2 = bytes[offset++]! & 0x3f
			byte3 = bytes[offset++]! & 0x3f
			units.push(((byte1 & 0x1f) << 12) | (byte2 << 6) | byte3)
		}
		else if ((byte1 & 0xf8) === 0xf0) {
			byte2 = bytes[offset++]! & 0x3f
			byte3 = bytes[offset++]! & 0x3f
			byte4 = bytes[offset++]! & 0x3f
			let unit = ((byte1 & 0x07) << 0x12) | (byte2 << 0x0c) | (byte3 << 0x06) | byte4
			if (unit > 0xffff) {
				unit -= 0x10000
				units.push(((unit >>> 10) & 0x3ff) | 0xd800)
				unit = 0xdc00 | (unit & 0x3ff)
			}
			units.push(unit)
		}
		else {
			units.push(byte1)
		}
 
		if (units.length >= decodeStringChunkSize) {
			result += String.fromCharCode.apply(null, units)
			units.length = 0
		}
	}
 
	if (units.length > 0) {
		result += String.fromCharCode.apply(null, units)
	}
 
	return result
}
 