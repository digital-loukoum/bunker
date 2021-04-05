import Memory from "./Memory"
import Encoder, {
	Dispatcher as Schema,
	DispatcherRecord as EncoderDispatcherRecord,
} from "./encode/Encoder"
import Decoder, {
	Dispatcher as DecoderDispatcher,
	DispatcherRecord as DecoderDispatcherRecord,
} from "./decode/Decoder"
import BufferEncoder from "./encode/BufferEncoder"
import BufferDecoder from "./decode/BufferDecoder"
import { isAugmented } from "./augment"
import { hasMemory, DispatcherWithMemory as SchemaWithMemory } from "./schemaOf"

export default function compile(schema: Schema | SchemaWithMemory) {
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
		decode(decoder: Decoder | Uint8Array) {
			if (decoder instanceof Uint8Array) decoder = new BufferDecoder(decoder)
			decoder.reset()
			const encodedSchema = decoder.bytes(data.byteLength)
			for (let i = 0; i < data.byteLength; i++) {
				if (data[i] != encodedSchema[i]) {
					console.log(
						"[Decoder] The compiled schema is not the same as in the encoded data; recompiling schema before decoding"
					)
					return decoder.decode()
				}
			}
			// if the schema is the same, we can use the compiled dispatcher
			decoder.memory = decoderMemory
			return (decoderDispatcher as DecoderDispatcher).call(decoder)
		},

		decodeNaked(decoder: Decoder | Uint8Array) {
			if (decoder instanceof Uint8Array) decoder = new BufferDecoder(decoder)
			decoder.reset()
			decoder.memory = decoderMemory
			return (decoderDispatcher as DecoderDispatcher).call(decoder)
		},
	}
}

/**
 * Transform a EncoderDispatcher into a DecoderDispatcher
 */
export function encoderToDecoder(schema: Schema): DecoderDispatcher {
	const encoder = Encoder.prototype
	const decoder = Decoder.prototype

	if (isAugmented(schema))
		switch (schema.target) {
			case encoder.instance:
				return decoder.instance(schema["0"])
			case encoder.recall:
				return decoder.recall(schema["0"])
			case encoder.nullable:
				return decoder.nullable(encoderToDecoder(schema["0"]))
			case encoder.tuple:
				return decoder.tuple(
					schema["0"].map((dispatcher: Schema) => encoderToDecoder(dispatcher))
				)
			case encoder.object:
				return decoder.object(encoderToDecoderProperties(schema["0"]))
			case encoder.array:
				return decoder.array(
					encoderToDecoder(schema["0"]),
					encoderToDecoderProperties(schema["1"])
				)
			case encoder.set:
				return decoder.set(
					encoderToDecoder(schema["0"]),
					encoderToDecoderProperties(schema["1"])
				)
			case encoder.map:
				return decoder.map(
					encoderToDecoder(schema["0"]),
					encoderToDecoderProperties(schema["1"])
				)
			case encoder.record:
				return decoder.record(encoderToDecoder(schema["0"]))
			default:
				throw `[encoderToDecoder] Unknown schema ${schema.target.name}`
		}
	else
		switch (schema) {
			case encoder.unknown:
				return decoder.unknown
			case encoder.character:
				return decoder.character
			case encoder.binary:
				return decoder.binary
			case encoder.boolean:
				return decoder.boolean
			case encoder.smallInteger:
			case encoder.integer:
				return decoder.integer
			case encoder.integer32:
				return decoder.integer32
			case encoder.integer64:
				return decoder.integer64
			case encoder.positiveInteger:
				return decoder.positiveInteger
			case encoder.bigInteger:
				return decoder.bigInteger
			case encoder.number:
				return decoder.number
			case encoder.number32:
				return decoder.number32
			case encoder.number64:
				return decoder.number64
			case encoder.string:
				return decoder.string
			case encoder.regularExpression:
				return decoder.regularExpression
			case encoder.date:
				return decoder.date
			case encoder.any:
				return decoder.any
			default:
				throw `[encoderToDecoder] Unknown schema ${schema.name}`
		}
}

function encoderToDecoderProperties(encoderProperties: EncoderDispatcherRecord) {
	const decoderProperties: DecoderDispatcherRecord = {}
	for (const key in encoderProperties)
		decoderProperties[key] = encoderToDecoder(encoderProperties[key])
	return decoderProperties
}
