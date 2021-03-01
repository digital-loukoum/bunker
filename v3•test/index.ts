import start from 'fartest'
import sample from './sample'
import samples from '../samples'
import { bunker, debunker, guessSchema } from '../bunker • 3'

start(function({stage, same}) {
	stage('Sample')
	{
		const data = bunker(sample)
		same(sample, debunker(data), "Sample")
	}

	stage('Random samples')
	for (const sample in samples) {
		const value = samples[sample]
		const data = bunker(value)
		same(value, debunker(data), sample)
	}

	stage('Precompile')
	{
		const value = sample
		const { encode, decode } = bunker.compile(guessSchema(sample))
		const data = encode(value)
		const decoded = decode(data)
		same(value, decoded)
	}
})
