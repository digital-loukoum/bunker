import Type from './Type.js'

enum ByteIndicator {
	null = 0,
	undefined,
	defined,
	object,
	reference = Object.keys(Type).length + 1,
	stop = 255,
}

export default ByteIndicator
