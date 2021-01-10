(() => {
  // dist/Type.js
  var Type;
  (function(Type8) {
    Type8[Type8["Boolean"] = 0] = "Boolean";
    Type8[Type8["Integer"] = 1] = "Integer";
    Type8[Type8["BigInteger"] = 2] = "BigInteger";
    Type8[Type8["Number"] = 3] = "Number";
    Type8[Type8["String"] = 4] = "String";
    Type8[Type8["Date"] = 5] = "Date";
    Type8[Type8["Object"] = 6] = "Object";
    Type8[Type8["Array"] = 7] = "Array";
  })(Type || (Type = {}));
  var Type_default = Type;

  // dist/Type.ts
  var Type2;
  (function(Type8) {
    Type8[Type8["Boolean"] = 0] = "Boolean";
    Type8[Type8["Integer"] = 1] = "Integer";
    Type8[Type8["BigInteger"] = 2] = "BigInteger";
    Type8[Type8["Number"] = 3] = "Number";
    Type8[Type8["String"] = 4] = "String";
    Type8[Type8["Date"] = 5] = "Date";
    Type8[Type8["Object"] = 6] = "Object";
    Type8[Type8["Array"] = 7] = "Array";
  })(Type2 || (Type2 = {}));
  var Type_default2 = Type2;

  // dist/schema/guessSchema.js
  const schemaFromType = {
    number: (value) => Number.isInteger(value) ? Type_default2.Integer : Type_default2.Number,
    bigint: () => Type_default2.BigInteger,
    string: () => Type_default2.String,
    boolean: () => Type_default2.Boolean,
    object: (object) => {
      if (!object)
        return Type_default2.Object;
      if (object instanceof Date)
        return Type_default2.Date;
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
  function guessSchema(value) {
    return schemaFromType[typeof value](value);
  }

  // dist/utf8string.ts
  const cache = {};
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  function encode(value) {
    if (value in cache == false)
      cache[value] = encoder.encode(value);
    return cache[value];
  }

  // dist/schema/writeSchema.ts
  function writeSchema(schema, buffer, offset = 0) {
    const write = (type) => {
      if (typeof type == "object") {
        buffer[offset++] = Array.isArray(type) ? Type_default2.Array : Type_default2.Object;
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

  // dist/schema/sizeofSchema.ts
  function sizeofSchema(schema) {
    let sum = 1;
    if (typeof schema == "object") {
      for (const key in schema) {
        sum += encode(key).length + 1 + sizeofSchema(schema[key]);
      }
      sum++;
    }
    return sum;
  }

  // dist/writers/createDispatcher.js
  function objectHandler(propertyDispatcher, value) {
    for (const key in propertyDispatcher)
      propertyDispatcher[key](value[key]);
  }
  function arrayHandler(dispatchArray, dispatchElement, propertyDispatcher, value) {
    dispatchArray(value);
    for (let element of value)
      dispatchElement(element);
    for (const key in propertyDispatcher)
      propertyDispatcher[key](value[key]);
  }
  function createDispatcher(schema, handler) {
    if (typeof schema == "object") {
      if (Array.isArray(schema)) {
        const typeofArray = schema[0];
        const properties = schema[1] || {};
        const propertyDispatcher = {};
        for (let key in properties)
          propertyDispatcher[key] = createDispatcher(properties[key], handler);
        return arrayHandler.bind(null, handler[Type_default.Array], createDispatcher(typeofArray, handler), propertyDispatcher);
      } else {
        const propertyDispatcher = {};
        for (let key in schema)
          propertyDispatcher[key] = createDispatcher(schema[key], handler);
        return objectHandler.bind(null, propertyDispatcher);
      }
    }
    return handler[schema];
  }

  // dist/writers/toRawData.js
  const endOfString = new Uint8Array([0]);
  function toBufferArray(value, schema) {
    const schemaSize = sizeofSchema(schema);
    const schemaBuffer = new Uint8Array(schemaSize);
    let size = schemaSize;
    writeSchema(schema, schemaBuffer);
    const buffers = [new Uint32Array([schemaSize]), schemaBuffer];
    const dispatch = createDispatcher(schema, {
      [Type_default2.Boolean]: (value2) => {
        buffers.push(new Uint8Array([value2 ? 0 : 1]));
        size += 1;
      },
      [Type_default2.Integer]: (value2) => {
        buffers.push(new Int32Array([value2]));
        size += 4;
      },
      [Type_default2.BigInteger]: (value2) => {
        buffers.push(new BigInt64Array([value2]));
        size += 8;
      },
      [Type_default2.Number]: (value2) => {
        buffers.push(new Float64Array([value2]));
        size += 8;
      },
      [Type_default2.Date]: (value2) => {
        buffers.push(new BigInt64Array([BigInt(value2.getTime())]));
        size += 8;
      },
      [Type_default2.String]: (value2) => {
        const buffer = encode(value2);
        buffers.push(buffer, endOfString);
        size += buffer.byteLength;
      },
      [Type_default2.Array]: (value2) => {
        buffers.push(new Uint32Array([value2.length]));
        size += 4;
      }
    });
    dispatch(value);
    return [buffers, size];
  }

  // dist/main.ts
  function bunkerRawData(value, schema = guessSchema(value)) {
    return toBufferArray(value, schema);
  }

  // test/samples/simple-object.ts
  var simple_object_default = new class {
    constructor() {
      this.zero = 0;
      this.one = 1;
      this.true = true;
      this.false = false;
      this.infinity = Infinity;
      this["-Infinity"] = -Infinity;
      this.int = 765768657;
      this.double = 5.97987;
      this.string = "Hey my friends";
      this.arrayOfIntegers = [5, 32, 78];
    }
  }();

  // test/index.ts
  const rawData = bunkerRawData(simple_object_default);
  console.log(rawData);
})();
