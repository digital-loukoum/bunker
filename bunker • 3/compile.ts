import Encoder, { Dispatcher as EncoderDispatcher, DispatcherRecord as EncoderDispatcherRecord } from './encode/Encoder'
import Decoder, { Dispatcher as DecoderDispatcher, DispatcherRecord as DecoderDispatcherRecord } from './decode/Decoder'
import BufferEncoder from './encode/BufferEncoder'
import BufferDecoder from './decode/BufferDecoder'
import { isAugmented } from './augment'

export default function compile(schema: EncoderDispatcher) {
	const schemaEncoder = new BufferEncoder
	schemaEncoder.schema(schema)  // write the schema
	const schemaData = schemaEncoder.data
	let decoderDispatcher: null | DecoderDispatcher = null

	return {
		encode(value: any, encoder = new BufferEncoder) {
			encoder.bytes(schemaData)
			schema.call(encoder, value)
			return encoder.data
		},

		/**
		 * The decoder needs a special treatment so we distribute it as a getter
		 * so that the treatment is never done if the user only needs to compile
		 * the encoder.
		 */
		get decode() {
			if (!decoderDispatcher) decoderDispatcher = compileDecoder(schema)
			return function decode(decoder: Decoder | Uint8Array) {
				if (decoder instanceof Uint8Array) decoder = new BufferDecoder(decoder)
				const encodedSchema = decoder.bytes(schemaData.byteLength)
				for (let i = 0; i < schemaData.byteLength; i++) {
					if (schemaData[i] != encodedSchema[i]) {
						console.log("[Decoder] The compiled schema is not the same as in the encoded data; recompiling schema before decoding")
						return decoder.decode()
					}
				}
				// if the schema is the same, we can use the compiled dispatcher
				return (decoderDispatcher as DecoderDispatcher).call(decoder)
			}
		}
	}
}

/**
 * Transform a EncoderDispatcher into a DecoderDispatcher
 */
function compileDecoder(schema: EncoderDispatcher): DecoderDispatcher {
	const encoder = Encoder.prototype
	const decoder = Decoder.prototype

	if (isAugmented(schema)) switch (schema.target) {
		case encoder.nullable: return decoder.nullable(compileDecoder(schema['0']))
		case encoder.tuple: return decoder.tuple(schema['0'].map((dispatcher: EncoderDispatcher) => compileDecoder(dispatcher)))
		case encoder.object: return decoder.object(compileDecoderProperties(schema['0']))
		case encoder.array: return decoder.array(compileDecoder(schema['0']), compileDecoderProperties(schema['1']))
		case encoder.set: return decoder.set(compileDecoder(schema['0']), compileDecoderProperties(schema['1']))
		case encoder.map: return decoder.map(compileDecoder(schema['0']), compileDecoderProperties(schema['1']))
		case encoder.record: return decoder.record(compileDecoder(schema['0']))
		default: throw `[compileDecoder] Unknown schema ${schema.target.name}`
	}
	else switch (schema) {
		case encoder.unknown: return decoder.unknown
		case encoder.character: return decoder.character
		case encoder.binary: return decoder.binary
		case encoder.boolean: return decoder.boolean
		case encoder.integer: return decoder.integer
		case encoder.positiveInteger: return decoder.positiveInteger
		case encoder.bigInteger: return decoder.bigInteger
		case encoder.number: return decoder.number
		case encoder.string: return decoder.string
		case encoder.regularExpression: return decoder.regularExpression
		case encoder.date: return decoder.date
		case encoder.any: return decoder.any
		default: throw `[compileDecoder] Unknown schema ${schema.name}`
	}
}


function compileDecoderProperties(encoderProperties: EncoderDispatcherRecord) {
	const decoderProperties: DecoderDispatcherRecord = {}
	for (const key in encoderProperties) decoderProperties[key] = compileDecoder(encoderProperties[key])
	return decoderProperties
}