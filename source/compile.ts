import Memory from "./Memory.js"
import { Dispatcher as Schema } from "./encode/Encoder.js"
import Decoder, { Dispatcher as DecoderDispatcher } from "./decode/Decoder.js"
import encoderToDecoder from "./encoderToDecoder.js"
import BufferEncoder from "./encode/BufferEncoder.js"
import BufferDecoder from "./decode/BufferDecoder.js"
import { hasMemory, DispatcherWithMemory as SchemaWithMemory } from "./schemaOf.js"

export default function compile<Type>(schema: Schema<Type> | SchemaWithMemory<Type>) {
	const schemaEncoder = new BufferEncoder()
	let dispatcher!: Schema
	if (hasMemory(schema)) {
		dispatcher = schema.dispatcher
		schemaEncoder.memory.schema = schema.memory
	} else dispatcher = schema

	// let's pre-encode the schema
	schemaEncoder.schema(dispatcher)

	const { data, memory } = schemaEncoder
	const decoderDispatcher = encoderToDecoder(dispatcher)
	const encoderMemory = memory
	const decoderMemory = memory.clone() as Memory<DecoderDispatcher>
	decoderMemory.schema.dispatchers = decoderMemory.schema.dispatchers.map(dispatcher =>
		encoderToDecoder(dispatcher)
	)

	return {
		encodedSchema: data,

		encode(value: any, encoder = new BufferEncoder()) {
			encoder.reset()
			encoder.bytes(data)
			encoder.memory = encoderMemory
			dispatcher.call(encoder, value)
			return encoder.data
		},

		encodeNaked(value: any, encoder = new BufferEncoder()) {
			encoder.reset()
			encoder.memory = encoderMemory
			dispatcher.call(encoder, value)
			return encoder.data
		},

		/**
		 * The decoder needs a special treatment so we distribute it as a getter
		 * so that the treatment is never done if the user only needs to compile
		 * the encoder.
		 */
		decode(decoder: Decoder | Uint8Array): Type {
			if (decoder instanceof Uint8Array) decoder = new BufferDecoder(decoder)
			decoder.reset()
			const encodedSchema = decoder.bytes(data.byteLength)
			for (let i = 0; i < data.byteLength; i++) {
				if (data[i] != encodedSchema[i]) {
					console.log(
						"[Decoder] The compiled schema is not the same as in the encoded data; recompiling schema before decoding"
					)
					return decoder.decode() as Type
				}
			}
			// if the schema is the same, we can use the compiled dispatcher
			decoder.memory = decoderMemory
			return (decoderDispatcher as DecoderDispatcher).call(decoder)
		},

		decodeNaked(decoder: Decoder | Uint8Array): Type {
			if (decoder instanceof Uint8Array) decoder = new BufferDecoder(decoder)
			decoder.reset()
			decoder.memory = decoderMemory
			return (decoderDispatcher as DecoderDispatcher).call(decoder)
		},
	}
}
