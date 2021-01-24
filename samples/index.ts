import {
	readdirSync,
	readFileSync,
} from 'fs'
import { basename } from 'path'

const samples = {}

// we load the samples from the samples directory
for (const file of readdirSync('benchmark/samples')) {
	if (!file.endsWith('.json')) continue
	const content = readFileSync(`benchmark/samples/${file}`, 'utf8')
	samples[basename(file)] = JSON.parse(content)
}

export default samples