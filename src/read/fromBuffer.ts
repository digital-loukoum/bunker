import Type from '../Type'
import { decode } from '../utf8string'
import readSchema from './readSchema'
import Reader from './Reader'
import createDispatcher from '../createDispatcher'
import Schema from '../Schema'

export default function fromBuffer(buffer: Uint8Array, offset = 0): unknown {
	const view = new DataView(buffer.buffer)
	const shift = (value: number) => {
		const before = offset
		offset += value
		return before
	}
	const readString = () => {
		const begin = offset
		while (buffer[++offset]);
		return decode(buffer, begin, offset++)
	}

	const read = () => {
		let schema: Schema
		;[schema, offset] = readSchema(buffer, offset)
	
		const dispatch = createDispatcher(schema, new class extends Reader {
			[Type.Null] = () => null;
			[Type.Undefined] = () => undefined;
			[Type.Any] = read;
			[Type.Boolean] = () => view.getUint8(offset++) ? true : false;
			[Type.Integer] = () => view.getInt32(shift(4));
			[Type.PositiveInteger] = () => view.getUint32(shift(4));
			[Type.BigInteger] = () => view.getBigInt64(shift(8));
			[Type.Number] = () => view.getFloat64(shift(8));
			[Type.Date] = () => new Date(Number(view.getBigInt64(shift(8))));
			[Type.String] = readString;
			[Type.RegExp] = () => new RegExp(readString(), readString());
		})
	
		return dispatch()
	} 

	return read()
}
