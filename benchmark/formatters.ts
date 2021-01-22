export function formatSize(value: number) {
	if (value >= 10 ** 6) return `${(value / 10 ** 6).toPrecision(3)} mo`
	if (value >= 10 ** 3) return `${(value / 10 ** 3).toPrecision(3)} ko`
	return `${value.toPrecision(3)} o`
}

export function formatTime(value: number) {
	if (value >= 1) return `${value.toPrecision(3)} ms`
	return `${(value * 1000).toPrecision(3)} ns`
}
