import Type from "../Type";
const schemaFromType = {
  number: (value) => Number.isInteger(value) ? Type.Integer : Type.Number,
  bigint: () => Type.BigInteger,
  string: () => Type.String,
  boolean: () => Type.Boolean,
  object: (object) => {
    if (!object)
      return Type.Object;
    if (object instanceof Date)
      return Type.Date;
    if (Array.isArray(object)) {
      const schema = [guessSchema(object[0]), {}];
      for (const key in object)
        if (!Number.isInteger(+key)) {
          if (object[key] !== void 0 && typeof object[key] != "function") {
            schema[1][key] = guessSchema(object[key]);
          }
        }
      return schema;
    } else {
      const schema = {};
      for (const key in object)
        if (object[key] !== void 0 && typeof object[key] != "function")
          schema[key] = guessSchema(object[key]);
      return schema;
    }
  }
};
export default function guessSchema(value) {
  return schemaFromType[typeof value](value);
}
