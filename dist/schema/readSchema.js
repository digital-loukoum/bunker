import {decode} from "../utf8string";
import Type from "../Type";
export default function readSchema(buffer, offset = 0) {
  const read = () => {
    const type = buffer[offset++];
    if (type >= Type.Object) {
      const schema = {};
      while (buffer[offset]) {
        const begin = offset;
        while (buffer[++offset])
          ;
        const key = +decode(buffer, begin, offset++);
        schema[key] = read();
      }
      offset++;
      return schema;
    }
    return type;
  };
  return read();
}
