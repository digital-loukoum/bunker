
export type Augmented<Fn extends any> = Fn & {
	target: Fn
	'0': any
	'1': any
}

export function isAugmented<Fn extends Function>(fn: Fn): fn is Augmented<Fn> {
	return 'target' in fn
}

/**
 * Augment a function with a target and up to two arguments.
 * Calling this mutates the function to augment, so the function argument must be defined when calling augment() only!
 * In other words, you should do: `augment((x: number) => x + 1)` and not: `augment(previouslyDefinedFunction)`.
 */
export default function augment<A extends Function, Target extends Function>(augmented: A, target: Target, arg0?: any, arg1?: any): Augmented<A> {
	// @ts-ignore
	augmented.target = target
	// @ts-ignore
	augmented['0'] = arg0
	// @ts-ignore
	augmented['1'] = arg1
	// @ts-ignore
	return augmented
}
