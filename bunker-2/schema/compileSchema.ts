import Type from "../constants/Type"
import Schema, { BunkerObject, isPrimitive, isObject, isArray, BunkerArray } from "../schema/Schema"
import Encoder from "../encode/Encoder"

type Dispatcher =  (value: any) => void 

export default (schema: Schema, encoder: Encoder): Dispatcher => {
	function compileSchema(schema: Schema): Dispatcher {
		if (isPrimitive(schema)) {
			encoder.byte(schema)
			return encoder[Type[schema] as keyof Encoder]
		}
		else if (isObject(schema)) {
			return compileObject(schema)
		}
		else if (isArray(schema)) {
			return compileArray(schema)
		}
	
		// else {
		// 	throw Error(`Cannot happen`)
		// }
	
	}
	
	function compileObject(schema: BunkerObject): Dispatcher {
		encoder.byte(Type.object)
		const dispatcher: Record<string, Dispatcher> = {}
		for (const key in schema) {
			encoder.string(key)
			dispatcher[key] = compileSchema(schema[key])
		}
		return encoder.object.bind(encoder, dispatcher)
	}

	function compileArray(schema: BunkerArray): Dispatcher {
		encoder.byte(Type.array)
		const dispatcher = compileSchema(schema.type)
		const propertiesDispatcher = schema.properties && compileObject(schema.properties)
		return encoder.array.bind(encoder, dispatcher, propertiesDispatcher)
	}

	return compileSchema(schema)
}

