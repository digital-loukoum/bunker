import { open, writeSync, close } from "fs"
import BufferWriter from "./BufferWriter"
import guessSchema from '../guessSchema'
import Type from '../Type'

/**
 * File writing use a double-buffering implementation.
 */
export default class FileWriter extends BufferWriter {
	file!: number

	constructor(readonly filename: string) {
		super()
	}

	/**
	 * Start the writing with the given value and schema
	 */
	write(value: any, schema = guessSchema(value)) {
		return new Promise<void>((resolve, reject) => {
			open(this.filename, 'w', (error, file) => {
				if (error) return reject(error)
				this.file = file
				this[Type.Any](value, schema)
				this.writeFile()
				close(file, error => error ? reject(error) : resolve())
			})
		})
	}

	/**
	 * Unlike a BufferWriter, no resizing is done.
	 * Instead, the old buffer is set to write to the output file.
	 * And a new
	 */
	protected resizeBuffer(newSize: number) {
		if (this.capacity == 64)
			super.resizeBuffer(newSize)
		else this.writeFile()
	}

	/**
	 * Write the current buffer to the file
	 */
	protected writeFile() {
		writeSync(this.file, this.buffer, 0, this.size)
		this.size = 0
	}
}
