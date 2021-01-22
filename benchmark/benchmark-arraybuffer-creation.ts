

const iterations = new Array(10 ** 6).fill(0)

for (let i = 64; i  < 128; i++) {
	const size = i
	console.time(`new Uint8Array(${size})`)
	for (const _ of iterations) {
		const value = new Uint8Array(size)
	}
	console.timeEnd(`new Uint8Array(${size})`)
}

