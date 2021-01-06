const cache = {};
const encoder = new TextEncoder();
const decoder = new TextDecoder();
export function encode(value) {
  if (value in cache == false)
    cache[value] = encoder.encode(value);
  return cache[value];
}
export function decode(uint8Array, begin = 0, end = uint8Array.length) {
  return decoder.decode(uint8Array.subarray(begin, end));
}
export function cleanCache() {
  for (let key in cache)
    delete cache[key];
}
export {cache};
