import { Dispatcher } from "./decode/Decoder.js"

/**
 * Transform a schema into a Typescript type.
 * @example type MyType = SchemaToType<typeof mySchema>
 */
export type SchemaToType<T> = T extends Dispatcher ? Parameters<T>[0] : never
