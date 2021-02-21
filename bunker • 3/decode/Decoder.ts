import Coder from '../Coder'
import Byte from '../Byte'

export type Dispatcher = () => any
export type DispatcherRecord = Record<string, Dispatcher>

export default abstract class Decoder implements Coder<Dispatcher> {
	decodeString = TextDecoder.prototype.decode.bind(new TextDecoder)

	abstract byte(): number  // read a single byte
	abstract bytes(stopAtByte: number): Uint8Array  // read bytes until a stop byte value
	abstract nextByteIs(byte: number): boolean  // check if next byte has a value; increment the cursor if true	
}
