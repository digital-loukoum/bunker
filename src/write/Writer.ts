import Type from '../Type.js'
import ByteIndicator from '../ByteIndicator.js'
import Handler from '../Handler.js'
import Schema, {
	isPrimitive,
	Nullable,
	ArrayOf,
	thenIsObject,
	SetOf,
	MapOf,
	RecordOf,
	ReferenceTo,
} from '../Schema.js'
import guessSchema from '../guessSchema'

export type Dispatcher<Type = any> = (value: Type) => any
type PropertyDispatcher = Record<string, Dispatcher>

export default abstract class Writer extends Handler {
	abstract [Type.Null]: Dispatcher<null | undefined>
	abstract [Type.Boolean]: Dispatcher<boolean>
	abstract [Type.Character]: Dispatcher<number>
	abstract [Type.Number]: Dispatcher<number>
	abstract [Type.Integer]: Dispatcher<number>
	abstract [Type.PositiveInteger]: Dispatcher<number>
	abstract [Type.BigInteger]: Dispatcher<bigint>
	abstract [Type.Date]: Dispatcher<Date>
	abstract [Type.String]: Dispatcher<string>
	abstract [Type.RegExp]: Dispatcher<RegExp>

	/**
	 * If the given object is a reference, write the reference index and return false.
	 * Otherwise, apply the fallback indicator and return true.
	 */
	[Type.Reference] = (object: Object): boolean => {
		const index = this.references.indexOf(object)
		if (~index) {
			this[Type.Character](Type.Reference)
			this[Type.PositiveInteger](index)
			return true
		}
		this.references.push(object)
		this[Type.Character](ByteIndicator.object)
		return false
	}

	[Type.Any] = (value: any, schema = guessSchema(value)) => {
		this.writeSchema(schema)
		const dispatch = this.createDispatcher(schema)
		dispatch(value)
	};


	[Type.Nullable] = (dispatch: Dispatcher, nullable: any) => {
		if (nullable == null)
			this[Type.Character](nullable === null ? ByteIndicator.null : ByteIndicator.undefined);
		else {
			this[Type.Character](ByteIndicator.defined);
			dispatch(nullable);
		}
	}
	
	[Type.Object] = (dispatchProperty: PropertyDispatcher, object: Record<string, any>) => {
		if (this[Type.Reference](object)) return
		for (const key in dispatchProperty)
			dispatchProperty[key](object[key])
	}
	
	[Type.Record] = (dispatchElement: Dispatcher, object: Record<string, any>) => {
		if (this[Type.Reference](object)) return
		this[Type.PositiveInteger](Object.keys(object).length)
		for (const key in object) {
			this[Type.String](key)  // we write the key
			dispatchElement(object[key])  // we write the value
		}
	}
	
	[Type.Array] = (dispatchElement: Dispatcher, dispatchProperty: PropertyDispatcher, array: Array<any>) => {
		if (this[Type.Reference](array)) return
		this[Type.PositiveInteger](array.length)
		for (const element of array)
			dispatchElement(element)
		for (const key in dispatchProperty)
			dispatchProperty[key](array[key as any])
	}
	
	[Type.Set] = (dispatchElement: Dispatcher, set: Set<any>) => {
		if (this[Type.Reference](set)) return
		this[Type.PositiveInteger](set.size)
		for (const element of set.values())
			dispatchElement(element)
	}
	
	[Type.Map] = (dispatchElement: Dispatcher, map: Map<string, any>) => {
		if (this[Type.Reference](map)) return
		this[Type.PositiveInteger](map.size)
		for (const [key, value] of map.entries()) {
			this[Type.String](key)
			dispatchElement(value)
		}
	}

	writeSchema(schema: Schema) {
		if (isPrimitive(schema)) {
			this[Type.Character](schema)
		}
		else if (schema.constructor == ReferenceTo) {
			this[Type.Character](Type.Reference)
			this[Type.PositiveInteger](schema.reference)
		}
		else if (schema.constructor == Nullable) {
			this[Type.Character](Type.Nullable)
			this.writeSchema(schema.type)
		}
		else {
			this.schemaReferences.push(schema)

			if (schema.constructor == RecordOf) {
				this[Type.Character](Type.Record)
				this.writeSchema(schema.type)
			}
			else if (schema.constructor == ArrayOf) {
				this[Type.Character](Type.Array)
				this.writeSchema(schema.type)
				this.writeSchema(schema.properties || {})
			}
			else if (schema.constructor == SetOf) {
				this[Type.Character](Type.Set)
				this.writeSchema(schema.type)
			}
			else if (schema.constructor == MapOf) {
				this[Type.Character](Type.Map)
				this.writeSchema(schema.type)
			}
			else if (thenIsObject(schema)) {  // regular object
				this[Type.Character](Type.Object)
				for (const key in schema) {
					this[Type.String](key)
					this.writeSchema(schema[key])
				}
				this[Type.Character](ByteIndicator.stop)  // end of object
			}
			}
	}
}
