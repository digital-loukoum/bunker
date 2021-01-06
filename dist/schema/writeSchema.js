import {encode} from "../utf8string";
import Type from "../Type";
export default function writeSchema(schema, buffer, offset = 0) {
  const write = (type) => {
    if (typeof type == "object") {
      buffer[offset++] = Array.isArray(type) ? Type.Array : Type.Object;
      for (const key in type) {
        const keyData = encode(key);
        buffer.set(keyData, offset);
        offset += keyData.length;
        buffer[offset++] = 0;
        write(type[key]);
      }
      buffer[offset++] = 0;
    } else
      buffer[offset++] = type;
  };
  write(schema);
  return offset;
}
