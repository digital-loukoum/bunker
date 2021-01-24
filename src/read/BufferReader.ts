import Type from '../Type'
import { decode } from '../utf8string'
import createDispatcher from '../createDispatcher'
import Reader from './Reader'
import Schema, { MapRecord, Nullable, ObjectRecord } from '../Schema'

export default class BufferReader extends Reader {
	private view = new DataView(this.buffer)

	constructor(
		private buffer: Uint8Array,
		private cursor = 0,
	) { super() }

	[Type.Null] = () => this.readChar() ? undefined : null;
	[Type.Any] = () => createDispatcher(this.readSchema(), this)();
	[Type.Boolean] = () => !!this.readChar();
	[Type.Character] = () => this.readChar();
	[Type.String] = () => this.readString();
	[Type.RegExp] = () => new RegExp(this.readString(), this.readString());

	[Type.Number] = () => {
		const number = this.view.getFloat64(this.cursor)
		this.cursor += 8
		return number
	};

	[Type.Integer] = () => {
		let sign = 1
		let integer = this.readChar()
		if (integer & 128) {
			sign = -1
			integer %= 128
		}
		let byte: number
		do {
			byte = this.readChar()
			integer = (integer << 7) + (byte % 128)
		} while (byte & 128)
		return sign * integer
	};

	[Type.PositiveInteger] = () => {
		let integer: number = 0
		let byte: number
		do {
			byte = this.readChar()
			integer = (integer << 7) + (byte % 128)
		} while (byte & 128)
		return integer
	};

	[Type.BigInteger] = () => {
		const bigint = this.view.getBigInt64(this.cursor)
		this.cursor += 8
		return bigint
	};

	[Type.Date] = () => {
		const time = this.view.getFloat64(this.cursor)
		this.cursor += 8
		return new Date(time)
	};


	readChar() {
		return this.view.getUint8(this.cursor++)
	}

	readString() {
		const begin = this.cursor
		while (this.buffer[this.cursor]) this.cursor++;
		return decode(this.buffer, begin, this.cursor++)
	}

	readSchema(): Schema {
		const type = this.buffer[this.cursor++]

		switch (type) {
			case Type.Object: {
				const schema: Schema = {}
				while (this.buffer[this.cursor]) {  // BUG : empty keys will cause to stop early
					const key = this.readString()
					schema[key] = this.readSchema()
				}
				this.cursor++
				return schema
			}
	
			case Type.Array:
				return [this.readSchema(), this.readSchema()] as Schema

			case Type.Nullable:
				return Nullable(this.readSchema())
					
			case Type.ObjectRecord:
				return new ObjectRecord(this.readSchema())
	
			case Type.Set:
				return new Set([this.readSchema()])
			
			case Type.Map: {
				const schema = new Map
				while (this.buffer[this.cursor]) {  // BUG : empty keys will cause to stop early
					const key = this.readString()
					schema.set(key, this.readSchema())
				}
				this.cursor++
				return schema
			}

			case Type.MapRecord:
				return new MapRecord(this.readSchema())
		}
		
		return type
	}
}