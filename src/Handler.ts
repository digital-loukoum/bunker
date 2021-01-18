import Type from './Type'
import Dispatcher from './Dispatcher'

type Handler = {
	[Type.Null]: Dispatcher
	[Type.Undefined]: Dispatcher
	[Type.Any]: Dispatcher
	[Type.Boolean]: Dispatcher
	[Type.Number]: Dispatcher
	[Type.Integer]: Dispatcher
	[Type.PositiveInteger]: Dispatcher
	[Type.BigInteger]: Dispatcher
	[Type.Date]: Dispatcher
	[Type.String]: Dispatcher
	[Type.RegExp]: Dispatcher
	[Type.Object]: Dispatcher
	[Type.ObjectRecord]: Dispatcher
	[Type.Array]: Dispatcher
	[Type.Set]: Dispatcher
	[Type.Map]: Dispatcher
	[Type.MapRecord]: Dispatcher
}

export default Handler