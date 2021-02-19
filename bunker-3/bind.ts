
export type Bound<Fn extends Function> = Fn & {
	__boundArguments__: any[]
	__target__: Fn
}

export function isBound<Fn extends Function>(fn: Fn): fn is Bound<Fn> {
	return '__boundArguments__' in fn
}

/**
 * Wrapper for the Function.prototype.bind function that give access to bound arguments.
 */
export default function bind<Fn extends Function>(fn: Function, ...args: any[]): Bound<Fn> {
	// if (isBound(fn)) fn = fn.__target__
	const bound = fn.bind(null, ...args)
	bound.__target__ = fn
	bound.__boundArguments__ = args
	return bound
}
