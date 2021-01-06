import Type from '../Type'
import Schema from '../Schema'

const schemaFromType: { [key: string]: (value: any) => Schema } = {
	number: (value: number) => Number.isInteger(value) ? Type.Integer : Type.Number,
	bigint: () => Type.BigInteger,
	string: () => Type.String,
	boolean: () => Type.Boolean,
	object: (object: { [key: string]: any}) => {
		if (!object) return Type.Object
		if (object instanceof Date) return Type.Date

		if (Array.isArray(object)) {
			const schema: Schema = [guessSchema(object[0]), {}]
			
			for (const key in object)
				if (!Number.isInteger(+key))
					if (object[key] !== undefined && typeof object[key] != 'function') {
						// @ts-ignore (compiler complains schema[1] might be undefined but it's obviously not)
						schema[1][key] = guessSchema(object[key])
					}

			return schema
		}

		else {
			const schema: Schema = {}

			for (const key in object)
				if (object[key] !== undefined && typeof object[key] != 'function')
					schema[key] = guessSchema(object[key])
	
			return schema
		}
	},
}

export default function guessSchema(value: string | number | Object | boolean | bigint): Schema {
	return schemaFromType[typeof value](value)
}
