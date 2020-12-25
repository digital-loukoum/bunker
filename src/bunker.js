
// export type Unit = {
// 	save(value: any): void,
// 	load(buffer): any,
// }
// export type Schema = { [key: string] }

import toSize from './writers/toSize.js'
import toArrayBuffer from './writers/toArrayBuffer.js'

import resolve from './resolve.js'
import Type from './Type.js'


export function sizeofBunker(object, schema) {
	return resolve(object, schema, toSize)
}


export function bunker(object, schema, file = '') {
	if (typeof schema == 'string') {
		file = schema
		schema = null
	}

	if (file)
		console.log("TODO")
	else {
		return resolve(object, schema, toArrayBuffer)
	}
}

Object.assign(bunker, Type)


/*
export default function bunker(object) {
	// we loop through the schema and bind values
	const self = {
		buffers: [],
		size: 0,
		offset: 0,
	}

	schema = boundSchema(schema, self)

	return {
		save() {
			for (let key in schema)
				schema[key].save(object[key])
			return self.buffers
		},

		load(buffers) {
			const object = {}
			let i = 0
			for (const key in schema)
				object[key] = schema[key].load(buffers[i++])
			return object
		},

		get length() {
			return self.size
		}
	}
}


Bunker.Integer = {
	save(value) {
		this.buffers.push(new Int32Array([value]))
		this.size += 4
	},

	load(buffer) {
		return new Int32Array(buffer)[0]
	},
}

Bunker.BigInteger = {
	save(value) {
		this.buffers.push(new BigInt64Array([value]))
		this.size += 8
	},

	load(buffer) {
		return new BigInt64Array(buffer)[0]
	},
}

Bunker.Number = {
	save(value) {
		this.buffers.push(new Float64Array([value]))
		this.size += 8
	},

	load(buffer) {
		return new Float64Array(buffer)[0]
	},
}

Bunker.Boolean = {
	save(value) {
		this.buffers.push(new Uint8Array([value ? 1 : 0]))
		this.size += 1
	},

	load(buffer) {
		return Boolean(new Uint8Array(buffer)[0])
	},
}

Bunker.String = {
	save(value) {
		const data = new TextEncoder().encode(value)
		this.buffers.push(data)
		this.size += data.length
	},

	load(buffer) {
		return new TextDecoder().decode(buffer)
	},
}
*/


