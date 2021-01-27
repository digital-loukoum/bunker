import Type from '../Type.js'
import Handler from '../Handler.js'
import ByteIndicator from '../ByteIndicator.js'
import Schema, { nullable, arrayOf, setOf, mapOf, recordOf, SchemaObject, referenceTo } from '../Schema.js'

type Dispatcher<Type = any> = () => Type
type PropertyDispatcher = Record<string, Dispatcher>

export default abstract class Reader extends Handler {
	private reference!: Object  // the last reference object

	abstract expectCharacter: (character: number) => boolean
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
	 * Return if the next object to dispatch is a reference or not
	 * If it is a reference, store the object in this.reference
	 * this.indicator will store the indicator byte - which can be a length for an array, set or record
	 */
	protected isReference(): boolean {
		if (this[Type.Character]() == ByteIndicator.reference) {
			const index = this[Type.PositiveInteger]()
			this.reference = this.references[index]
			return true
		}
		return false
	}

	protected addReference(object: Object) {
		this.references.push(object)
		return object
	}

	[Type.Any] = () => {
		const schema = this.readSchema()
		console.log("Read schema:", schema)
		this.createDispatcher(schema)()
	}

	[Type.Nullable] = (dispatch: Dispatcher) => {
		switch (this[Type.Character]()) {
			case ByteIndicator.null: return null
			case ByteIndicator.undefined: return undefined
			default: return dispatch()
		}
	}
	
	[Type.Object] = (dispatchProperty: PropertyDispatcher) => {
		console.log("Read object")
		if (this.isReference()) return this.reference
		const object: Record<string, any> = {}
		for (const key in dispatchProperty)
			object[key] = dispatchProperty[key]()
		return this.addReference(object)
	}

	[Type.Record] = (dispatchElement: Dispatcher) => {
		if (this.isReference()) return this.reference
		const length = this[Type.PositiveInteger]()
		const object: Record<string, any> = {}
		for (let i = 0; i < length; i++) {
			const key = this[Type.String]()
			object[key] = dispatchElement()
		}
		return this.addReference(object)
	}

	[Type.Array] = (dispatchElement: Dispatcher, dispatchProperty: PropertyDispatcher) => {
		if (this.isReference()) return this.reference
		const length = this[Type.PositiveInteger]()
		const array: any = Array(length)
		for (let i = 0; i < length; i++)
			array[i] = dispatchElement()
		for (const key in dispatchProperty)
			array[key] = dispatchProperty[key]()
		return this.addReference(array)
	}
	
	[Type.Set] = (dispatchElement: Dispatcher) => {
		if (this.isReference()) return this.reference
		const length = this[Type.PositiveInteger]()
		const set = new Set
		for (let i = 0; i < length; i++)
			set.add(dispatchElement())
		return this.addReference(set)
	}
	
	// [Type.Map] = (dispatchProperty: PropertyDispatcher) => {
	// 	if (this.isReference()) return this.reference
	// 	const map = new Map<string, any>()
	// 	for (const key in dispatchProperty)
	// 		map.set(key, dispatchProperty[key]())
	// 	return this.addReference(map)
	// }
	
	[Type.Map] = (dispatchElement: Dispatcher) => {
		if (this.isReference()) return this.reference
		const map: Map<string, any> = new Map
		const length = this[Type.PositiveInteger]()
		for (let i = 0; i < length; i++) {
			const key = this[Type.String]()
			map.set(key, dispatchElement())
		}
		return this.addReference(map)
	}

	readSchema(): Schema {
		const indicator = this[Type.Character]()

		switch (indicator) {
			case Type.Nullable:
				return nullable(this.readSchema())
			
			case ByteIndicator.reference: {
				const reference = this[Type.PositiveInteger]()
				console.log("Read schema reference!", reference, this.schemaReferences[reference])
				return referenceTo(this.schemaReferences[reference])
			}

			case Type.Array: {
				const schema = arrayOf()
				this.schemaReferences.push(schema)
				schema.type = this.readSchema()
				schema.properties = this.readSchema() as SchemaObject
				return schema
			}

			case Type.Record: {
				const schema = recordOf()
				this.schemaReferences.push(schema)
				schema.type = this.readSchema()
				return schema

			}

			case Type.Set: {
				const schema = setOf()
				this.schemaReferences.push(schema)
				schema.type = this.readSchema()
				return schema
			}

			case Type.Map: {
				const schema = mapOf()
				this.schemaReferences.push(schema)
				schema.type = this.readSchema()
				return schema
			}

			case Type.Object: {
				console.log("Read schema object!")
				const schema: Schema = {}
				this.schemaReferences.push(schema)
				while (!this.expectCharacter(ByteIndicator.stop)) {
					const key = this[Type.String]()
					console.log("key", key)
					schema[key] = this.readSchema()
					console.log("value", schema[key])
				}
				return schema
			}
		}
		return indicator
	}
}
