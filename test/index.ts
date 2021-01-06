import { bunker } from '../src/main'

import simpleObject from './samples/simple-object'

bunker.file(simpleObject, 'test/samples/simple-object.bunker').then(() => {
	console.log("Done")
})
