import Type from './Type'

type Schema = Type | { [key: string]: Schema } | [ Schema, { [key: string]: Schema }? ]

export default Schema
