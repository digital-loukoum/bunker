import Type from '../Type.js'
import ByteIndicator from '../ByteIndicator.js'
import Handler from '../Handler.js'
import Schema, { isObject, isArray, isObjectRecord, isSet, isMap, isMapRecord, isPrimitive, isNullable } from '../Schema.js'

export type Dispatcher<Type = any> = (value: Type) => any
type PropertyDispatcher = Record<string, Dispatcher>

export default abstract class Writer implements Handler {
	private references: Object[] = []  // list of all objects written. The index is the reference
	abstract [Type.Null]: Dispatcher<null | undefined>
	abstract [Type.Any]: Dispatcher<any>
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
	protected dispatchReference(object: Object): boolean {
		const index = this.references.indexOf(object)
		if (~index) {
			this[Type.Character](ByteIndicator.reference)
			this[Type.PositiveInteger](index)
			return true
		}
		this.references.push(object)
		this[Type.Character](ByteIndicator.object)
		return false
	}

	[Type.Unknown]() {}

	[Type.Nullable](dispatch: Dispatcher, nullable: any) {
		if (nullable == null)
			this[Type.Character](nullable === null ? ByteIndicator.null : ByteIndicator.undefined);
		else {
			this[Type.Character](ByteIndicator.defined);
			dispatch(nullable);
		}
	}
	
	[Type.Object](dispatchProperty: PropertyDispatcher, object: Record<string, any>) {
		if (this.dispatchReference(object)) return
		for (const key in dispatchProperty)
			dispatchProperty[key](object[key])
	}
	
	[Type.ObjectRecord](dispatchElement: Dispatcher, object: Record<string, any>) {
		if (this.dispatchReference(object)) return
		this[Type.PositiveInteger](Object.keys(object).length)
		for (const key in object) {
			this[Type.String](key)  // we write the key
			dispatchElement(object[key])  // we write the value
		}
	}
	
	[Type.Array](dispatchElement: Dispatcher, dispatchProperty: PropertyDispatcher, array: Array<any>) {
		if (this.dispatchReference(array)) return
		this[Type.PositiveInteger](array.length)
		for (const element of array)
			dispatchElement(element)
		for (const key in dispatchProperty)
			dispatchProperty[key](array[key as any])
	}
	
	[Type.Set](dispatchElement: Dispatcher, set: Set<any>) {
		if (this.dispatchReference(set)) return
		this[Type.PositiveInteger](set.size)
		for (const element of set.values())
			dispatchElement(element)
	}
	
	[Type.Map](dispatchProperty: PropertyDispatcher, map: Map<string | number, any>) {
		if (this.dispatchReference(map)) return
		for (const key in dispatchProperty)
			dispatchProperty[key](map.get(key))
	}
	
	[Type.MapRecord](dispatchElement: Dispatcher, map: Map<string, any>) {
		if (this.dispatchReference(map)) return
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

		else if (isNullable(schema)) {
			this[Type.Character](Type.Nullable)
			this.writeSchema(schema.type)
		}
		
		else if (isObject(schema)) {
			this[Type.Character](Type.Object)
			for (const key in schema) {
				this[Type.String](key)
				this.writeSchema(schema[key])
			}
			this[Type.Character](0)  // end of object
		}
	
		else if (isObjectRecord(schema)) {
			this[Type.Character](Type.ObjectRecord)
			this.writeSchema(schema.type)
		}
	
		else if (isArray(schema)) {
			this[Type.Character](Type.Array)
			this.writeSchema(schema[0])
			this.writeSchema(schema[1] || {})
		}
	
		else if (isSet(schema)) {
			this[Type.Character](Type.Set)
			this.writeSchema(schema.values().next().value)
		}
	
		else if (isMap(schema)) {
			this[Type.Character](Type.Map)
			for (const [key, value] of schema.entries()) {
				this[Type.String](key)
				this.writeSchema(value)
			}
			this[Type.Character](0)  // end of object
		} 
	
		else if (isMapRecord(schema)) {
			this[Type.Character](Type.MapRecord)
			this.writeSchema(schema.type)
		}
	}}
