import { open } from "fs"
import FileDecoder from "./decode/FileDecoder.js"
import FileEncoder from "./encode/FileEncoder.js"
import { Schema, SchemaWithMemory } from "./index.js"

export async function bunkerFile(
	fileName: string,
	value: any,
	schema?: Schema | SchemaWithMemory
): Promise<void> {
	return new Promise((resolve, reject) => {
		open(fileName, "w", (error, fileDescriptor) => {
			if (error) reject(error)
			else resolve(new FileEncoder(fileDescriptor).encode(value, schema))
		})
	})
}

export async function debunkerFile(fileName: string): Promise<unknown> {
	return new Promise((resolve, reject) => {
		open(fileName, "r", (error, fileDescriptor) => {
			if (error) reject(error)
			else resolve(new FileDecoder(fileDescriptor).decode())
		})
	})
}
