import { bunker, guessSchema } from '../bunker-2'

console.log(bunker)
const data = [{x: 3, y: 51}, {x: 33, y: 5}]
const encode = bunker.compile(guessSchema(data))
console.log(encode(data))
