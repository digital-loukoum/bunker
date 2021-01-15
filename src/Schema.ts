import Type from './Type'

type Schema = Type | { [key: string]: Schema } | [ Schema, { [key: string]: Schema }? ] | Map<string, Schema> | Set<Schema>

const schemaFromType: Record<string, (value: any) => Schema> = {
	undefined: () => Type.Undefined,
	number: (value: number) => Number.isInteger(value) ? Type.Integer : Type.Number,
	bigint: () => Type.BigInteger,
	string: () => Type.String,
	boolean: () => Type.Boolean,
	object: (object: Record<string, any>) => {
		if (!object) return Type.Null
		if (object instanceof Date) return Type.Date
		if (object instanceof RegExp) return Type.RegExp

		if (Array.isArray(object)) {
			const schema: Schema = [guessSchema(object[0]), {}]
			for (const key in object) {
				if (!Number.isInteger(+key)) {
					if (typeof object[key] != 'function') {
						// @ts-ignore (compiler complains schema[1] might be undefined but it's obviously not)
						schema[1][key] = guessSchema(object[key])
					}
				}
			}
			return schema
		}
		else if (object instanceof Set) {
			const schema: Schema = new Set
			schema.add(Type.Any)
			return schema
		}
		else if (object instanceof Map) {
			const schema: Schema = new Map
			for (const [key, value] of object) {
				if (typeof value != 'function') {
					schema.set(key, guessSchema(value))
				}
			}
			return schema
		}
		else {  // regular object
			const schema: Schema = {}
			for (const key in object) {
				if (typeof object[key] != 'function') {
					schema[key] = guessSchema(object[key])
				}
			}
			return schema
		}
	},
}

export function guessSchema(value: string | number | Object | boolean | bigint): Schema {
	return schemaFromType[typeof value](value)
}

export default Schema
