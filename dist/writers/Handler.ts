import Dispatcher from './Dispatcher'
import Type from '../Type'

type Handler = {
	[Type.Boolean]: Dispatcher<boolean>
	[Type.Number]: Dispatcher<number>
	[Type.Integer]: Dispatcher<number>
	[Type.BigInteger]: Dispatcher<bigint>
	[Type.Date]: Dispatcher<Date>
	[Type.String]: Dispatcher<string>
	[Type.Array]: Dispatcher<Array<any>>
	[Type.Object]?: Dispatcher<Object>
}

export default Handler
