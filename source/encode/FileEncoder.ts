import { writeSync, closeSync } from "fs"
import Encoder, { Dispatcher } from "./Encoder.js"
import { DispatcherWithMemory } from "../schemaOf.js"

export default class FileEncoder extends Encoder {
	constructor(public fileDescriptor: number, chunkSize?: number) {
		super(chunkSize)
	}

	encode(value: any, schema?: Dispatcher | DispatcherWithMemory) {
		super.encode(value, schema)
		this.onCapacityFull()
		closeSync(this.fileDescriptor)
	}

	// On capacity full, we write the data to the file and reset the size
	onCapacityFull() {
		if (this.size) {
			writeSync(this.fileDescriptor, this.data)
			this.size = 0
		}
	}
}
