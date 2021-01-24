import Type from '../Type.js'
import Handler from '../Handler.js'

type Dispatcher<Type = any> = () => Type
type PropertyDispatcher = Record<string, Dispatcher>

export default abstract class Reader implements Handler {
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

	[Type.Unknown]() {}

	[Type.Nullable](dispatch: Dispatcher) {
		switch (this[Type.Character]()) {
			case 0: return null
			case 1: return undefined
			default: return dispatch()
		}
	}
	
	[Type.Object](dispatchProperty: PropertyDispatcher) {
		const object: Record<string, any> = {}
		for (const key in dispatchProperty)
			object[key] = dispatchProperty[key]()
		return object
	}

	[Type.ObjectRecord](dispatchElement: Dispatcher) {
		const object: Record<string, any> = {}
		const length = this[Type.PositiveInteger]()
		for (let i = 0; i < length; i++) {
			const key = this[Type.String]()
			object[key] = dispatchElement()
		}
		return object
	}

	[Type.Array](dispatchElement: Dispatcher, dispatchProperty: PropertyDispatcher) {
		const array: any = []
		array.length = this[Type.PositiveInteger]()
		for (let i = 0; i < array.length; i++)
			array[i] = dispatchElement()
		for (const key in dispatchProperty)
			array[key] = dispatchProperty[key]()
		return array
	}
	
	[Type.Set](dispatchElement: Dispatcher) {
		const set = new Set
		const length = this[Type.PositiveInteger]()
		for (let i = 0; i < length; i++)
			set.add(dispatchElement())
		return set
	}
	
	[Type.Map](dispatchProperty: PropertyDispatcher) {
		const map = new Map<string, any>()
		for (const key in dispatchProperty)
			map.set(key, dispatchProperty[key]())
		return map
	}
	
	[Type.MapRecord](dispatchElement: Dispatcher) {
		const map: Map<string, any> = new Map
		const length = this[Type.PositiveInteger]()
		for (let i = 0; i < length; i++) {
			const key = this[Type.String]()
			map.set(key, dispatchElement())
		}
		return map
	}
}
