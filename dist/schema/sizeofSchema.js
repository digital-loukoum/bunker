import {encode} from "../utf8string";
export default function sizeofSchema(schema) {
  let sum = 1;
  if (typeof schema == "object") {
    for (const key in schema) {
      sum += encode(key).length + 1 + sizeofSchema(schema[key]);
    }
    sum++;
  }
  return sum;
}
