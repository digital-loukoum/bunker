
export type Bound<Fn extends Function> = Fn & {
	0: any
	1: any
	target: Fn
}

export function isBound<Fn extends Function>(fn: Fn): fn is Bound<Fn> {
	return 'target' in fn
}

/**
 * Wrapper for the Function.prototype.bind function that give access to bound arguments.
 */
export default function bind<Fn extends Function>(fn: Function, ...args: any[]): Bound<Fn> {
	const bound = fn.bind(null, ...args)
	bound.target = fn
	bound['0'] = args[0]
	bound['1'] = args[1]
	return bound
}
