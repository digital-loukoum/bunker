import Type from "../Type";
import {encode} from "../utf8string";
import writeSchema from "../schema/writeSchema";
import sizeofSchema from "../schema/sizeofSchema";
import createDispatcher from "./createDispatcher";
const endOfString = new Uint8Array([0]);
export default function toBufferArray(value, schema) {
  const schemaSize = sizeofSchema(schema);
  const schemaBuffer = new Uint8Array(schemaSize);
  let size = schemaSize;
  writeSchema(schema, schemaBuffer);
  const buffers = [new Uint32Array([schemaSize]), schemaBuffer];
  const dispatch = createDispatcher(schema, {
    [Type.Boolean]: (value2) => {
      buffers.push(new Uint8Array([value2 ? 0 : 1]));
      size += 1;
    },
    [Type.Integer]: (value2) => {
      buffers.push(new Int32Array([value2]));
      size += 4;
    },
    [Type.BigInteger]: (value2) => {
      buffers.push(new BigInt64Array([value2]));
      size += 8;
    },
    [Type.Number]: (value2) => {
      buffers.push(new Float64Array([value2]));
      size += 8;
    },
    [Type.Date]: (value2) => {
      buffers.push(new BigInt64Array([BigInt(value2.getTime())]));
      size += 8;
    },
    [Type.String]: (value2) => {
      const buffer = encode(value2);
      buffers.push(buffer, endOfString);
      size += buffer.byteLength;
    },
    [Type.Array]: (value2) => {
      buffers.push(new Uint32Array([value2.length]));
      size += 4;
    }
  });
  dispatch(value);
  return [buffers, size];
}
