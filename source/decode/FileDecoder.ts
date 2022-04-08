import { readSync, closeSync } from "fs"
import ChunkDecoder from "./ChunkDecoder.js"

export default class FileDecoder extends ChunkDecoder {
	offset = 0

	constructor(public fileDescriptor: number, chunkSize?: number) {
		super(chunkSize)
	}

	decode() {
		readSync(this.fileDescriptor, this.buffer, 0, this.chunkSize, 0)
		this.offset = this.chunkSize
		const result = super.decode()
		closeSync(this.fileDescriptor)
		return result
	}

	/**
	 * Load the next chunk of data from the file
	 */
	loadNextChunk() {
		const bytesToKeep = this.buffer.byteLength - this.cursor
		if (bytesToKeep)
			// we copy the unread artifact to the start of buffer
			this.buffer.set(this.buffer.slice(this.cursor))
		readSync(
			this.fileDescriptor,
			this.buffer,
			bytesToKeep,
			this.chunkSize - bytesToKeep,
			this.offset
		)
		this.cursor = 0
		this.offset += this.chunkSize - bytesToKeep
	}
}
