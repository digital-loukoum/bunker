import Encoder from "./Encoder"
import { writeSync } from "fs"

export default class FileEncoder extends Encoder {
	constructor(public fileDescriptor: number, chunkSize?: number) {
		super(chunkSize)
	}

	// On capacity full, we write the data to the file and reset the size
	onCapacityFull() {
		writeSync(this.fileDescriptor, this.data)
		this.size = 0
	}
}
