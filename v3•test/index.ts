import start from 'fartest'
import samples from '../samples'
import { bunker } from '../bunker • 3'

start(function({stage}) {
	for (const sample in samples) {
		stage(sample)
		bunker(samples[sample])
	}
})
