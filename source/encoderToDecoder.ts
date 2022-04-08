import Encoder, {
	Dispatcher as Schema,
	DispatcherRecord as EncoderDispatcherRecord,
} from "./encode/Encoder.js"
import Decoder, {
	Dispatcher as DecoderDispatcher,
	DispatcherRecord as DecoderDispatcherRecord,
} from "./decode/Decoder.js"
import { isAugmented } from "./augment.js"

/**
 * Transform a EncoderDispatcher into a DecoderDispatcher
 */
export default function encoderToDecoder(schema: Schema): DecoderDispatcher {
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
					[encoderToDecoder(schema["0"]), encoderToDecoder(schema["1"])],
					encoderToDecoderProperties(schema["2"])
				)
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
			case encoder.integer:
				return decoder.integer
			case encoder.positiveInteger:
				return decoder.positiveInteger
			case encoder.bigInteger:
				return decoder.bigInteger
			case encoder.number:
				return decoder.number
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
