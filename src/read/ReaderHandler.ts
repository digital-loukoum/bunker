import Dispatcher from './Dispatcher'
import Type from '../Type'

type PropertyDispatcher = Record<string, Dispatcher>


export default abstract class ReaderHandler {
	[Type.Null]: Dispatcher<null>
	[Type.Undefined]: Dispatcher<undefined>
	[Type.Any]: Dispatcher<any>
	[Type.Boolean]: Dispatcher<boolean>
	[Type.Number]: Dispatcher<number>
	[Type.Integer]: Dispatcher<number>
	[Type.PositiveInteger]: Dispatcher<number>
	[Type.BigInteger]: Dispatcher<bigint>
	[Type.Date]: Dispatcher<Date>
	[Type.String]: Dispatcher<string>
	[Type.RegExp]: Dispatcher<RegExp>
	[Type.Object](propertyDispatcher: PropertyDispatcher): Record<string, any> {
		const result: Record<string, any> = {}
		for (const key in propertyDispatcher)
			result[key] = propertyDispatcher[key]()
		return result
		}
	[Type.ObjectRecord]?: Dispatcher<Object>
	[Type.Array]?: Dispatcher<Array<any>>
	[Type.Set]?: Dispatcher<Set<any>>
	[Type.Map]?: Dispatcher<Map<string | number, any>>
	[Type.MapRecord]?: Dispatcher<Map<string | number, any>>
}

export default Handler
