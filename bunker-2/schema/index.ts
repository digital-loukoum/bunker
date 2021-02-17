import Type from "../constants/Type"
export type Schema =
	| Type
	| BunkerObject
	| BunkerTuple


/* --- Generic types --- */
// -- object
export type BunkerObject = { [key: string]: Schema }
export const isObject = (value: any): value is BunkerObject => value.constructor == Object

// -- tuple
export type BunkerTuple = Schema[]
export const isTuple = (value: any): value is BunkerTuple => value.constructor == Array

// -- reference
export class BunkerReference {
	constructor(public reference: number) {}
}
export const isReference = (value: any): value is BunkerReference => value.constructor == BunkerReference


/* --- Schema constants (used for handmade schemas) --- */
export default {

}