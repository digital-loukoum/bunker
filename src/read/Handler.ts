import Dispatcher from './Dispatcher'
import Type from '../Type'

type Handler = {
	[Type.Null]: Dispatcher<null>
	[Type.Undefined]: Dispatcher<undefined>
	[Type.Boolean]: Dispatcher<boolean>
	[Type.Number]: Dispatcher<number>
	[Type.Integer]: Dispatcher<number>
	[Type.BigInteger]: Dispatcher<bigint>
	[Type.Date]: Dispatcher<Date>
	[Type.String]: Dispatcher<string>
	[Type.Array]: Dispatcher<number>
	[Type.Object]?: Dispatcher<Object>
}

export default Handler
