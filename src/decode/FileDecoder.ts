import { readSync } from "fs"
import ChunkDecoder from "./ChunkDecoder"
import DataBuffer from "../DataBuffer"

export default class FileDecoder extends ChunkDecoder {
	offset = 0

	constructor(public fileDescriptor: number, chunkSize?: number) {
		super(chunkSize)
	}

	/**
	 * Load the next chunk of data from the file
	 */
	async loadNextChunk() {
		const bytesToKeep = this.chunkSize - this.cursor
		const chunk = new DataBuffer(this.chunkSize)
		if (bytesToKeep)
			// we copy the unread artifact from the last chunk
			chunk.set(this.buffer.slice(this.cursor))
		readSync(
			this.fileDescriptor,
			chunk,
			bytesToKeep,
			this.chunkSize - bytesToKeep,
			this.offset
		)
		this.buffer = chunk
		this.cursor = 0
		this.offset += this.chunkSize - bytesToKeep
	}
}
