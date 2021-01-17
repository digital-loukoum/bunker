import guessSchema from '../src/guessSchema'

import object from './samples/simple-object'

console.log("Object :", object)

const schema = guessSchema(object)
console.log("Schema :", schema)
