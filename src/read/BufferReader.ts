import Type from '../Type'
import Reader from './Reader'
import ByteIndicator from '../ByteIndicator'

export default class BufferReader extends Reader {
	private view = new DataView(this.buffer.buffer)

	constructor(
		private buffer: Uint8Array,
		private cursor = 0,
	) { super() }

	expectCharacter = (character: number) =>
		this.view.getUint8(this.cursor) == character ? (this.cursor++, true) : false;

	[Type.Null] = () => this[Type.Character]() ? undefined : null;
	[Type.Boolean] = () => !!this[Type.Character]();
	[Type.Character] = () => this.view.getUint8(this.cursor++);
	[Type.RegExp] = () => new RegExp(this[Type.String](), this[Type.String]());

	[Type.String] = () => {
		if (this.expectCharacter(ByteIndicator.stringReference))
			return this[Type.StringReference]()
		const begin = this.cursor
		while (this.buffer[this.cursor]) this.cursor++;
		return this.decode(this.buffer, begin, this.cursor++)
	};

	[Type.Number] = () => {
		const number = this.view.getFloat64(this.cursor)
		this.cursor += 8
		return number
	};

	[Type.Integer] = () => {
		let sign = 1
		let integer = this[Type.Character]()
		if (integer & 128) {
			sign = -1
			integer %= 128
		}
		if (integer & 64) {
			let base = 64
			let byte: number
			integer %= 64
			do {
				byte = this[Type.Character]()
				integer += base * (byte % 128)
				base *= 128
			} while (byte & 128)
		}
		return sign * integer
	};

	[Type.PositiveInteger] = () => {
		let base = 1
		let byte: number
		let integer = 0
		do {
			byte = this[Type.Character]()
			integer += base * (byte % 128)
			base *= 128
		} while (byte & 128)
		return integer
	};

	[Type.BigInteger] = () => {
		let sign = 1n
		let bigint = BigInt(this[Type.Character]())
		if (bigint & 128n) {
			sign = -1n
			bigint %= 128n
		}
		if (bigint & 64n) {
			let base = 64n
			let byte: number
			bigint %= 64n
			do {
				byte = this[Type.Character]()
				bigint += base * BigInt(byte % 128)
				base *= 128n
			} while (byte & 128)
		}
		return sign * bigint
	};

	[Type.Date] = () => {
		const time = this.view.getFloat64(this.cursor)
		this.cursor += 8
		return new Date(time)
	};
}
