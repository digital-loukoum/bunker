
export type Unit = {
	save(value: any): Buffer,
	load(buffer: Buffer, offset: number): any,
}
export type Schema = { [key: string]: Unit }

export default class Bunker {
	object: Object
	schema: Schema

	constructor(object: Object, schema: Schema) {
		this.object = object
		this.schema = schema
		for (let prop in schema) {
			if (prop in object == false)
				console.warn(`Property '${prop}' in schema does not exist in object`, object)
		}
	}

	/**
	 * Return a buffer containing the bunker
	 */
	save(): Buffer {
		return Buffer.concat(Object.keys(this.schema).map(key => this.schema[key].save(this.object[key])))
	}

	load(buffer: Buffer): Object {
		const object = {}
		let offset = 0
		let value: any

		for (let key in this.schema) {
			[offset, value] = this.schema[key].load(buffer, offset)
			object[key] = value
		}

		return object
	}

	// types
	static Integer: Unit = {
		save(value: number) {
			const buffer = Buffer.allocUnsafe(4)
			buffer.writeInt32LE(value)
			return buffer
		},

		load(buffer: Buffer, offset: number) {
			return [offset + 4, buffer.readInt32LE(offset)]
		},
	}

	static BigInteger: Unit = {
		save(value: bigint) {
			const buffer = Buffer.allocUnsafe(8)
			buffer.writeBigInt64LE(value)
			return buffer
		},

		load(buffer: Buffer, offset: number) {
			return [offset + 8, buffer.readBigInt64LE(offset)]
		},
	}

	static Number: Unit = {
		save(value: number) {
			const buffer = Buffer.allocUnsafe(8)
			buffer.writeDoubleLE(value)
			return buffer
		},

		load(buffer: Buffer, offset: number) {
			return [offset + 8, buffer.readDoubleLE(offset)]
		},
	}

	static Boolean: Unit = {
		save(value: boolean) {
			return Buffer.from([value ? 0 : 1])
		},

		load(buffer: Buffer, offset: number) {
			return [offset + 1, buffer.readInt8(offset) ? true : false]
		},
	}

	static String: Unit = {
		save(value: string) {
			const length = Buffer.allocUnsafe(8)
			length.writeDoubleLE(value.length)
			return Buffer.concat([length, Buffer.from(value)])
		},

		load(buffer: Buffer, offset: number) {
			const end = buffer.readDoubleLE(offset) + offset + 8
			return [end, buffer.toString('utf8', offset + 8, end)]
		},
	}

	// static Any: Unit = {
	// 	save(value: any) {
	// 		if (value >= 0 && value < (2**7))
	// 			return Buffer.from([(2**8) + value])
			
	// 		else if (value < 0 && value > -(2**7))
	// 			return Buffer.from([(2**8) + (2**7) - value])
			
	// 		else {
	// 			const buffer = Buffer.allocUnsafe(4)
	// 			buffer.writeInt32LE(value)
	// 			return buffer
	// 		}
	// 	},

	// 	load() {

	// 	},
	// }

	// static Object = (schema: Schema) => ({
	// 	save() {

	// 	},

	// 	load() {

	// 	}
	// }) as Unit

	// static ArrayOf = (unit: Unit, schema: Schema = null) => ({
	// 	save() {

	// 	},

	// 	load() {

	// 	}
	// }) as Unit

}
