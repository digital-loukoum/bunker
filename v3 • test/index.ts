import start from 'fartest'
import samples from '../samples'
import { bunker } from '../bunker • 3'

const value = {
	x: 12,
	y: 11
}
const data = bunker(value)
console.log(data)