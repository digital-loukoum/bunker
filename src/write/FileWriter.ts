import { FileHandle, open } from "fs/promises"
import BufferWriter from "./BufferWriter"
import guessSchema from '../guessSchema'
import Type from '../Type'

type Chunk = [ buffer: Uint8Array, size: number ]


/**
 * File writing use a double-buffering implementation.
 */
export default class FileWriter extends BufferWriter {
	protected chunksToWrite: Chunk[] = []
	protected writeQueue = []
	protected file?: FileHandle
	protected openingFile: Promise<FileHandle>
	protected readingDone = false
	protected end?: (value: boolean) => void

	constructor(filename: string) {
		super(8192)
		this.openingFile = open(filename, 'w')
	}

	/**
	 * Start the writing with the given value and schema
	 */
	async write(value: any, schema = guessSchema(value)) {
		const result = new Promise(resolve => this.end = resolve)
		this[Type.Any](value, schema)
		// we push the last chunk and we indicate reading is done
		this.chunksToWrite.push([this.buffer, this.size])
		this.readingDone = true
		this.writeFile()
		return await result
	}

	/**
	 * Unlike a BufferWriter, no resizing is done.
	 * Instead, the old buffer is set to write to the output file.
	 * And a new
	 */
	protected resizeBuffer() {
		this.chunksToWrite.push([this.buffer, this.size])
		this.buffer = new Uint8Array(this.capacity)
		this.view = new DataView(this.buffer.buffer)
		this.size = 0
		if (this.chunksToWrite.length == 1) this.writeFile()
	}

	/**
	 * Write the current chunk to the file
	 */
	protected async writeFile() {
		if (!this.file) this.file = await this.openingFile
		
		if (this.chunksToWrite.length == 0) {
			if (this.readingDone) {
				await this.file.close()
				this.file = undefined
				this.end!(true)
			}
		}
		else {
			const [buffer, size] = this.chunksToWrite.shift() as Chunk
			await this.file.write(buffer, 0, size)
			this.writeFile()  // we write the next chunk
		}
	}
}
