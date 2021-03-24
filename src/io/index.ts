import { open } from "fs"
import FileDecoder from "../decode/FileDecoder"
import FileEncoder from "../encode/FileEncoder"
import { Schema, SchemaWithMemory } from "../index"

export async function bunkerFile(
	fileName: string,
	value: any,
	schema?: Schema | SchemaWithMemory
): Promise<void> {
	return new Promise((resolve, reject) => {
		open(fileName, "w", (error, fileDescriptor) => {
			if (error) reject(error)
			else {
				const encoder = new FileEncoder(fileDescriptor)
				encoder.encode(value, schema)
				resolve()
			}
		})
	})
}

export async function debunkerFile(fileName: string): Promise<any> {
	return new Promise((resolve, reject) => {
		open(fileName, "r", (error, fileDescriptor) => {
			if (error) reject(error)
			else resolve(new FileDecoder(fileDescriptor).decode())
		})
	})
}
