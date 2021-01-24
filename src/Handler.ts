import Type from './Type.js'
import Dispatcher from './Dispatcher.js'

type Handler = {
	[Type.Unknown]: Dispatcher
	[Type.Null]: Dispatcher
	[Type.Any]: Dispatcher
	[Type.Boolean]: Dispatcher
	[Type.Character]: Dispatcher
	[Type.Number]: Dispatcher
	[Type.Integer]: Dispatcher
	[Type.PositiveInteger]: Dispatcher
	[Type.BigInteger]: Dispatcher
	[Type.Date]: Dispatcher
	[Type.String]: Dispatcher
	[Type.RegExp]: Dispatcher
	[Type.Nullable]: Dispatcher
	[Type.Object]: Dispatcher
	[Type.ObjectRecord]: Dispatcher
	[Type.Array]: Dispatcher
	[Type.Set]: Dispatcher
	[Type.Map]: Dispatcher
	[Type.MapRecord]: Dispatcher
}

export default Handler