import Type from '../Type'
import Writer from './Writer'

export default class BufferWriter extends Writer {
	protected size = 0

	constructor(
		protected capacity = 64,
		protected buffer = new Uint8Array(capacity),
		protected view = new DataView(buffer.buffer),
	) { super() }

	get data() {
		return new Uint8Array(this.buffer.buffer, 0, this.size)
	}

	protected incrementSizeBy(value: number) {
		const requiredSize = this.size + value
		if (this.capacity < requiredSize)
			this.resizeBuffer(requiredSize)
	}
  
	protected resizeBuffer(newSize: number) {
		if (this.capacity == 64)
			this.capacity = 4096
		while (this.capacity < newSize)
			this.capacity *= 2
		const newBuffer = new ArrayBuffer(this.capacity)
		const newBytes = new Uint8Array(newBuffer)
		const newView = new DataView(newBuffer)
		newBytes.set(this.buffer)
		this.view = newView
		this.buffer = newBytes
	}

	[Type.Null] = (value: null | undefined) => {
		this[Type.Character](value === undefined ? 1 : 0)
	};
	
	[Type.Boolean] = (value: boolean) => {
		this[Type.Character](value ? 1 : 0)
	};

	[Type.Character] = (value: number) => {
		this.incrementSizeBy(1)
		this.view.setUint8(this.size, value)
		this.size++
	}

	[Type.Number] = (value: number) => {
		this.incrementSizeBy(8)
		this.view.setFloat64(this.size, value)
		this.size += 8
	};

	[Type.Integer] = (value: number) => {
		let sign = 0
		if (value < 0 ||( value == 0 && Object.is(value, -0))) {
			sign = 128
			value = -value
		}
		const nextValue = Math.floor(value / 64)
		this[Type.Character](sign + (nextValue ? 64: 0) + (value % 64))
		if (nextValue) this[Type.PositiveInteger](nextValue)
	};

	[Type.PositiveInteger] = (value: number) => {
		do {
			const nextValue = Math.floor(value / 128)
			this[Type.Character](value % 128 + (nextValue ? 128 : 0))
			value = nextValue
		} while (value)
	};

	[Type.BigInteger] = (value: bigint) => {
		let sign = 0
		if (value < 0n) {
			sign = 128
			value = -value
		}
		let nextValue = value / 64n
		this[Type.Character](sign + (nextValue ? 64 : 0) + Number(value % 64n))
		if (nextValue) {
			value = nextValue
			do {
				nextValue = value / 128n
				this[Type.Character]((nextValue ? 128 : 0) + Number(value % 128n))
				value = nextValue
			} while (value)
		}
	};

	[Type.Date] = (value: Date) => {
		this.incrementSizeBy(8)
		this.view.setFloat64(this.size, value.getTime())
		this.size += 8
	};

	[Type.String] = (value: string) => {
		const encoded = this.encode(value)
		this.incrementSizeBy(encoded.byteLength + 1)
		this.buffer.set(encoded, this.size)
		this.size += encoded.byteLength
		this.view.setUint8(this.size++, 0)
	}

	[Type.RegExp] = (value: RegExp) => {
		this[Type.String](value.source)
		this[Type.String](value.flags)
	};
}
