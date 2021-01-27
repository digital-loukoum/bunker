import Type from './Type.js'
import Schema, { isObject, isPrimitive, Nullable, RecordOf, ArrayOf, SetOf, MapOf, ReferenceTo } from './Schema.js'
import { encode, decode } from './utf8string'

type Dispatcher = (...args: any[]) => any
type PropertyDispatcher = Record<string, Dispatcher>

/**
 * A Handler is the base class Reader and Writer extend
 */
export default abstract class Handler {
	protected references: Object[] = []  // list of all objects that have been read. The index is the reference
	protected schemaReferences: Schema[] = []
	protected dispatchers: Dispatcher[] = []

	protected [Type.Unknown] = () => {}
	abstract [Type.Null]: Dispatcher
	abstract [Type.Any]: Dispatcher
	abstract [Type.Boolean]: Dispatcher
	abstract [Type.Character]: Dispatcher
	abstract [Type.Number]: Dispatcher
	abstract [Type.Integer]: Dispatcher
	abstract [Type.PositiveInteger]: Dispatcher
	abstract [Type.BigInteger]: Dispatcher
	abstract [Type.Date]: Dispatcher
	abstract [Type.String]: Dispatcher
	abstract [Type.RegExp]: Dispatcher
	abstract [Type.Nullable]: Dispatcher
	abstract [Type.Object]: Dispatcher
	abstract [Type.Record]: Dispatcher
	abstract [Type.Array]: Dispatcher
	abstract [Type.Set]: Dispatcher
	abstract [Type.Map]: Dispatcher
	abstract [Type.MapRecord]: Dispatcher

	decode(data: Uint8Array, begin: number, end: number) {
		return decode(data, begin, end)
	}

	encode(string: string) {
		return encode(string)
	}

	private dispatchSchemaReference(reference: number, value: any) {
		this.dispatchers[reference](value)
	}

	createDispatcher(schema: Schema): Dispatcher {
		if (isPrimitive(schema)) return this[schema]
		if (schema.constructor == Nullable) return this[Type.Nullable].bind(this, this.createDispatcher(schema.type))
		if (schema.constructor == ReferenceTo) {
			const reference = this.schemaReferences.indexOf(schema.link)
			console.log("Dispatcher reference", reference)
			return this.dispatchSchemaReference.bind(this, reference)
		}

		const reference = this.dispatchers.length++
		let dispatcher!: Dispatcher

		if (isObject(schema)) {
			const propertyDispatcher: PropertyDispatcher = {}
			for (const key in schema)
				propertyDispatcher[key] = this.createDispatcher(schema[key])
			dispatcher = this[Type.Object].bind(this, propertyDispatcher)
		}

		else if (schema.constructor == RecordOf) {
			dispatcher = this[Type.Record].bind(this, this.createDispatcher(schema.type))
		}
	
		else if (schema.constructor == ArrayOf) {
			const propertyDispatcher: PropertyDispatcher = {}
			if (schema.properties) for (const key in schema.properties) {
				propertyDispatcher[key] = this.createDispatcher(schema.properties[key])
			}
			dispatcher = this[Type.Array].bind(this, this.createDispatcher(schema.type), propertyDispatcher)
		}
		
		else if (schema.constructor == SetOf) {
			dispatcher = this[Type.Set].bind(this, this.createDispatcher(schema.type))
		}
	
		else if (schema.constructor == MapOf) {
			dispatcher = this[Type.MapRecord].bind(this, this.createDispatcher(schema.type))
		}

		console.log("Add dispatcher reference", reference)
		this.dispatchers[reference] = dispatcher
		return dispatcher	
	}
}
