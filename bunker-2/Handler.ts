import Schema, {
	isNullable,
	isReference,
	isObject,
	isTuple,
	isRecord,
	isArray,
	isSet,
	isMap,
	BunkerArray,
	BunkerSet,
	BunkerMap,
	BunkerRecord,
	BunkerObject,
} from './schema/Schema'
import Type from './constants/Type'

type Dispatcher = (...args: any[]) => any
type ObjectDispatcher = Record<string, Dispatcher>


export default abstract class Handler {

	objectDispatcher(schema: BunkerObject): ObjectDispatcher {
		const propertyDispatcher: ObjectDispatcher = {}
		for (const key in schema)
			propertyDispatcher[key] = this.dispatcher(schema[key])
		dispatcher = this[Type.Object].bind(this, propertyDispatcher)
		return dispatcher
	}
	
	// return the dispatcher of the additionnal properties of a container
	dispatcher(schema: Schema): Dispatcher {
		if (isPrimitive(schema)) return this[schema]
		if (schema.constructor == Nullable) return this[Type.Nullable].bind(this, this.dispatcher(schema.type))
		if (schema.constructor == ReferenceTo) {
			return (value?: any) => this.dispatchers[schema.reference](value)
		}

		const reference = this.dispatchers.length++
		let dispatcher!: Dispatcher

		if (isObject(schema)) {
			const propertyDispatcher: ObjectDispatcher = {}
			for (const key in schema)
				propertyDispatcher[key] = this.dispatcher(schema[key])
			dispatcher = this[Type.Object].bind(this, propertyDispatcher)
		}

		else if (isTuple(schema)) {
			const dispatchers = schema.map(type => this.dispatcher(type))
			dispatcher = this[Type.Tuple].bind(this, dispatchers)
		}

		else if (schema.constructor == RecordOf) {
			dispatcher = this[Type.Record].bind(this, this.dispatcher(schema.type))
		}
	
		else if (schema.constructor == ArrayOf) {
			dispatcher = this[Type.Array].bind(this, this.dispatcher(schema.type), this.propertiesDispatcher(schema))
		}
		
		else if (schema.constructor == SetOf) {
			dispatcher = this[Type.Set].bind(this, this.dispatcher(schema.type), this.propertiesDispatcher(schema))
		}
	
		else if (schema.constructor == MapOf) {
			dispatcher = this[Type.Map].bind(this, this.dispatcher(schema.type), this.propertiesDispatcher(schema))
		}

		this.dispatchers[reference] = dispatcher
		return dispatcher	
	}

	propertiesDispatcher(schema: BunkerArray | BunkerSet | BunkerMap | BunkerRecord) {
		const propertyDispatcher: ObjectDispatcher = {}
		if (schema.properties) for (const key in schema.properties) {
			propertyDispatcher[key] = this.dispatcher(schema.properties[key])
		}
		return propertyDispatcher
	}
}