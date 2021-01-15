import Dispatcher from './Dispatcher'
import Type from '../Type'

type Handler = {
	[Type.Null]: Dispatcher<null>
	[Type.Undefined]: Dispatcher<undefined>
	[Type.Any]: Dispatcher<any>
	[Type.Boolean]: Dispatcher<boolean>
	[Type.Number]: Dispatcher<number>
	[Type.Integer]: Dispatcher<number>
	[Type.BigInteger]: Dispatcher<bigint>
	[Type.Date]: Dispatcher<Date>
	[Type.String]: Dispatcher<string>
	[Type.RegExp]: Dispatcher<RegExp>
	[Type.Array]: Dispatcher<Array<any>>
	[Type.Object]?: Dispatcher<Object>
}

export default Handler
