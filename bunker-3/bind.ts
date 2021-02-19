
export type Bound<Fn extends Function> = Fn & {
	__boundArguments__: any[]
	__target__: Function
}

export function isBound(fn: Function): fn is Bound<Function> {
	return '__boundArguments__' in fn
}

/**
 * Wrapper for the Function.prototype.bind function that give access to bound arguments.
 * It also re-binds of already bound function instead of composing bindings.
 */
export default function bind<Fn extends Function>(fn: Function, ...args: any[]): Bound<Fn> {
	if (isBound(fn)) fn = fn.__target__
	const bound = fn.bind(null, ...args)
	bound.__target__ = fn
	bound.__boundArguments__ = args
	return bound
}
