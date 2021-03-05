
console.log(encodeNumber(1))

function encodeNumber(value: number) {
	if (value == 0) return new Uint8Array([0])
	const input = new DataView(new ArrayBuffer(8))
	const output = new DataView(new ArrayBuffer(9))
	input.setFloat64(0, value)

	// -- first we compute the number of bits to copy
	// (we don't copy the trailing zero bits)
	let bitsToCopy = 64
	let bitOffset = 1
	let byteOffset = 7
	let currentByte: number
	while ((currentByte = input.getUint8(byteOffset)) == 0) {
		byteOffset--
		bitsToCopy -= 8
	}
	while ((currentByte & bitOffset) == 0) {
		bitsToCopy--
		if (bitOffset == 128) break
		bitOffset *= 2
	}

	// -- next we copy the bytes from input to output by chunks of seven bits
	let copiedBits = 0
	bitOffset = 0
	byteOffset = 0
	currentByte = input.getUint8(byteOffset)
	let outputBitOffset = 0
	let outputByteOffset = 0
	let outputCurrentByte = 0
	while (copiedBits < bitsToCopy) {
		if (outputBitOffset == 0) {  // we write the continuation bit
			outputCurrentByte = bitsToCopy - copiedBits < 8 ? 0 : 128
			outputBitOffset = 1
		}
		let maxOffset = Math.max(bitOffset, outputBitOffset)
		let bitChunkSize = 8 - maxOffset
		let byteMask = 255 >> maxOffset << maxOffset >> bitOffset
		let byteToWrite = currentByte & byteMask
		if (outputBitOffset < bitOffset) byteToWrite <<= (bitOffset - outputBitOffset)
		else byteToWrite >>= (outputBitOffset - bitOffset)
		outputCurrentByte |= byteToWrite
		
		bitOffset += bitChunkSize
		outputBitOffset += bitChunkSize
		copiedBits += bitChunkSize
		if (bitOffset == 8) {
			bitOffset = 0
			currentByte = input.getUint8(++byteOffset)
		}
		if (outputBitOffset == 8) {
			outputBitOffset = 0
			output.setUint8(outputByteOffset++, outputCurrentByte)
		}
	}

	return new Uint8Array(output.buffer, 0, outputByteOffset)
}