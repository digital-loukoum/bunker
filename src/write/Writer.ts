import Type from '../Type.js'
import Handler from '../Handler.js'

export type Dispatcher<Type = any> = (value: Type) => any
type PropertyDispatcher = Record<string, Dispatcher>

export default abstract class Writer implements Handler {
	abstract [Type.Null]: Dispatcher<null>
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

	[Type.Unknown]() {}

	[Type.Nullable](dispatch: Dispatcher, nullable: any) {
		if (nullable == null)
			this[Type.Character](nullable === null ? 0 : 1);
		else {
			this[Type.Character](2);
			dispatch(nullable);
		}
	}
	
	[Type.Object](dispatchProperty: PropertyDispatcher, object: Record<string, any>) {
		for (const key in dispatchProperty)
			dispatchProperty[key](object[key])
	}
	
	[Type.ObjectRecord](dispatchElement: Dispatcher, object: Record<string, any>) {
		const length = Object.keys(object).length
		this[Type.PositiveInteger](length)  // we write the length
		for (const key in object) {
			this[Type.String](key)  // we write the key
			dispatchElement(object[key])  // we write the value
		}
	}
	
	[Type.Array](dispatchElement: Dispatcher, dispatchProperty: PropertyDispatcher, array: Array<any>) {
		this[Type.PositiveInteger](array.length)  // we write the length
		for (const element of array)
			dispatchElement(element)
		for (const key in dispatchProperty)
			dispatchProperty[key](array[key as any])
	}
	
	[Type.Set](dispatchElement: Dispatcher, set: Set<any>) {
		this[Type.PositiveInteger](set.size)  // we write the length
		for (const element of set.values())
			dispatchElement(element)
	}
	
	[Type.Map](dispatchProperty: PropertyDispatcher, map: Map<string | number, any>) {
		for (const key in dispatchProperty)
			dispatchProperty[key](map.get(key))
	}
	
	[Type.MapRecord](dispatchElement: Dispatcher, map: Map<string, any>) {
		this[Type.PositiveInteger](map.size)  // we write the length
		for (const [key, value] of map.entries()) {
			this[Type.String](key)
			dispatchElement(value)
		}
	}
}
