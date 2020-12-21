(() => {
  // src/Bunker.ts
  var Bunker = class {
    constructor(object, schema) {
      this.object = object;
      this.schema = schema;
      for (let prop in schema) {
        if (prop in object == false)
          console.warn(`Property '${prop}' in schema does not exist in object`, object);
      }
    }
    save() {
      return Buffer.concat(Object.keys(this.schema).map((key) => this.schema[key].save(this.object[key])));
    }
    load(buffer2) {
      const object = {};
      let offset = 0;
      let value;
      for (let key in this.schema) {
        [offset, value] = this.schema[key].load(buffer2, offset);
        object[key] = value;
      }
      return object;
    }
  };
  Bunker.Integer = {
    save(value) {
      const buffer2 = Buffer.allocUnsafe(4);
      buffer2.writeInt32LE(value);
      return buffer2;
    },
    load(buffer2, offset) {
      return [offset + 4, buffer2.readInt32LE(offset)];
    }
  };
  Bunker.BigInteger = {
    save(value) {
      const buffer2 = Buffer.allocUnsafe(8);
      buffer2.writeBigInt64LE(value);
      return buffer2;
    },
    load(buffer2, offset) {
      return [offset + 8, buffer2.readBigInt64LE(offset)];
    }
  };
  Bunker.Number = {
    save(value) {
      const buffer2 = Buffer.allocUnsafe(8);
      buffer2.writeDoubleLE(value);
      return buffer2;
    },
    load(buffer2, offset) {
      return [offset + 8, buffer2.readDoubleLE(offset)];
    }
  };
  Bunker.Boolean = {
    save(value) {
      return Buffer.from([value ? 0 : 1]);
    },
    load(buffer2, offset) {
      return [offset + 1, buffer2.readInt8(offset) ? true : false];
    }
  };
  Bunker.String = {
    save(value) {
      const length = Buffer.allocUnsafe(8);
      length.writeDoubleLE(value.length);
      return Buffer.concat([length, Buffer.from(value)]);
    },
    load(buffer2, offset) {
      const end = buffer2.readDoubleLE(offset) + offset + 8;
      return [end, buffer2.toString("utf8", offset + 8, end)];
    }
  };
  var Bunker_default = Bunker;

  // test/samples/sample.ts
  var sample_default = new class {
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
    }
  }();

  // node_modules/.pnpm/@msgpack/msgpack@2.3.0/node_modules/@msgpack/msgpack/dist.es5+esm/utils/utf8.mjs
  var TEXT_ENCODING_AVAILABLE = typeof process !== "undefined" && process.env.TEXT_ENCODING !== "never" && typeof TextEncoder !== "undefined" && typeof TextDecoder !== "undefined";
  var STR_SIZE_MAX = 4294967295;
  function utf8Count(str) {
    var strLength = str.length;
    var byteLength = 0;
    var pos = 0;
    while (pos < strLength) {
      var value = str.charCodeAt(pos++);
      if ((value & 4294967168) === 0) {
        byteLength++;
        continue;
      } else if ((value & 4294965248) === 0) {
        byteLength += 2;
      } else {
        if (value >= 55296 && value <= 56319) {
          if (pos < strLength) {
            var extra = str.charCodeAt(pos);
            if ((extra & 64512) === 56320) {
              ++pos;
              value = ((value & 1023) << 10) + (extra & 1023) + 65536;
            }
          }
        }
        if ((value & 4294901760) === 0) {
          byteLength += 3;
        } else {
          byteLength += 4;
        }
      }
    }
    return byteLength;
  }
  function utf8EncodeJs(str, output, outputOffset) {
    var strLength = str.length;
    var offset = outputOffset;
    var pos = 0;
    while (pos < strLength) {
      var value = str.charCodeAt(pos++);
      if ((value & 4294967168) === 0) {
        output[offset++] = value;
        continue;
      } else if ((value & 4294965248) === 0) {
        output[offset++] = value >> 6 & 31 | 192;
      } else {
        if (value >= 55296 && value <= 56319) {
          if (pos < strLength) {
            var extra = str.charCodeAt(pos);
            if ((extra & 64512) === 56320) {
              ++pos;
              value = ((value & 1023) << 10) + (extra & 1023) + 65536;
            }
          }
        }
        if ((value & 4294901760) === 0) {
          output[offset++] = value >> 12 & 15 | 224;
          output[offset++] = value >> 6 & 63 | 128;
        } else {
          output[offset++] = value >> 18 & 7 | 240;
          output[offset++] = value >> 12 & 63 | 128;
          output[offset++] = value >> 6 & 63 | 128;
        }
      }
      output[offset++] = value & 63 | 128;
    }
  }
  var sharedTextEncoder = TEXT_ENCODING_AVAILABLE ? new TextEncoder() : void 0;
  var TEXT_ENCODER_THRESHOLD = !TEXT_ENCODING_AVAILABLE ? STR_SIZE_MAX : typeof process !== "undefined" && process.env.TEXT_ENCODING !== "force" ? 200 : 0;
  function utf8EncodeTEencode(str, output, outputOffset) {
    output.set(sharedTextEncoder.encode(str), outputOffset);
  }
  function utf8EncodeTEencodeInto(str, output, outputOffset) {
    sharedTextEncoder.encodeInto(str, output.subarray(outputOffset));
  }
  var utf8EncodeTE = (sharedTextEncoder === null || sharedTextEncoder === void 0 ? void 0 : sharedTextEncoder.encodeInto) ? utf8EncodeTEencodeInto : utf8EncodeTEencode;
  var CHUNK_SIZE = 4096;
  function utf8DecodeJs(bytes, inputOffset, byteLength) {
    var offset = inputOffset;
    var end = offset + byteLength;
    var units = [];
    var result = "";
    while (offset < end) {
      var byte1 = bytes[offset++];
      if ((byte1 & 128) === 0) {
        units.push(byte1);
      } else if ((byte1 & 224) === 192) {
        var byte2 = bytes[offset++] & 63;
        units.push((byte1 & 31) << 6 | byte2);
      } else if ((byte1 & 240) === 224) {
        var byte2 = bytes[offset++] & 63;
        var byte3 = bytes[offset++] & 63;
        units.push((byte1 & 31) << 12 | byte2 << 6 | byte3);
      } else if ((byte1 & 248) === 240) {
        var byte2 = bytes[offset++] & 63;
        var byte3 = bytes[offset++] & 63;
        var byte4 = bytes[offset++] & 63;
        var unit = (byte1 & 7) << 18 | byte2 << 12 | byte3 << 6 | byte4;
        if (unit > 65535) {
          unit -= 65536;
          units.push(unit >>> 10 & 1023 | 55296);
          unit = 56320 | unit & 1023;
        }
        units.push(unit);
      } else {
        units.push(byte1);
      }
      if (units.length >= CHUNK_SIZE) {
        result += String.fromCharCode.apply(String, units);
        units.length = 0;
      }
    }
    if (units.length > 0) {
      result += String.fromCharCode.apply(String, units);
    }
    return result;
  }
  var sharedTextDecoder = TEXT_ENCODING_AVAILABLE ? new TextDecoder() : null;
  var TEXT_DECODER_THRESHOLD = !TEXT_ENCODING_AVAILABLE ? STR_SIZE_MAX : typeof process !== "undefined" && process.env.TEXT_DECODER !== "force" ? 200 : 0;
  function utf8DecodeTD(bytes, inputOffset, byteLength) {
    var stringBytes = bytes.subarray(inputOffset, inputOffset + byteLength);
    return sharedTextDecoder.decode(stringBytes);
  }

  // node_modules/.pnpm/@msgpack/msgpack@2.3.0/node_modules/@msgpack/msgpack/dist.es5+esm/ExtData.mjs
  var ExtData = function() {
    function ExtData3(type, data) {
      this.type = type;
      this.data = data;
    }
    return ExtData3;
  }();

  // node_modules/.pnpm/@msgpack/msgpack@2.3.0/node_modules/@msgpack/msgpack/dist.es5+esm/utils/int.mjs
  function setUint64(view, offset, value) {
    var high = value / 4294967296;
    var low = value;
    view.setUint32(offset, high);
    view.setUint32(offset + 4, low);
  }
  function setInt64(view, offset, value) {
    var high = Math.floor(value / 4294967296);
    var low = value;
    view.setUint32(offset, high);
    view.setUint32(offset + 4, low);
  }
  function getInt64(view, offset) {
    var high = view.getInt32(offset);
    var low = view.getUint32(offset + 4);
    return high * 4294967296 + low;
  }
  function getUint64(view, offset) {
    var high = view.getUint32(offset);
    var low = view.getUint32(offset + 4);
    return high * 4294967296 + low;
  }

  // node_modules/.pnpm/@msgpack/msgpack@2.3.0/node_modules/@msgpack/msgpack/dist.es5+esm/timestamp.mjs
  var EXT_TIMESTAMP = -1;
  var TIMESTAMP32_MAX_SEC = 4294967296 - 1;
  var TIMESTAMP64_MAX_SEC = 17179869184 - 1;
  function encodeTimeSpecToTimestamp(_a) {
    var sec = _a.sec, nsec = _a.nsec;
    if (sec >= 0 && nsec >= 0 && sec <= TIMESTAMP64_MAX_SEC) {
      if (nsec === 0 && sec <= TIMESTAMP32_MAX_SEC) {
        var rv = new Uint8Array(4);
        var view = new DataView(rv.buffer);
        view.setUint32(0, sec);
        return rv;
      } else {
        var secHigh = sec / 4294967296;
        var secLow = sec & 4294967295;
        var rv = new Uint8Array(8);
        var view = new DataView(rv.buffer);
        view.setUint32(0, nsec << 2 | secHigh & 3);
        view.setUint32(4, secLow);
        return rv;
      }
    } else {
      var rv = new Uint8Array(12);
      var view = new DataView(rv.buffer);
      view.setUint32(0, nsec);
      setInt64(view, 4, sec);
      return rv;
    }
  }
  function encodeDateToTimeSpec(date) {
    var msec = date.getTime();
    var sec = Math.floor(msec / 1e3);
    var nsec = (msec - sec * 1e3) * 1e6;
    var nsecInSec = Math.floor(nsec / 1e9);
    return {
      sec: sec + nsecInSec,
      nsec: nsec - nsecInSec * 1e9
    };
  }
  function encodeTimestampExtension(object) {
    if (object instanceof Date) {
      var timeSpec = encodeDateToTimeSpec(object);
      return encodeTimeSpecToTimestamp(timeSpec);
    } else {
      return null;
    }
  }
  function decodeTimestampToTimeSpec(data) {
    var view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    switch (data.byteLength) {
      case 4: {
        var sec = view.getUint32(0);
        var nsec = 0;
        return {sec, nsec};
      }
      case 8: {
        var nsec30AndSecHigh2 = view.getUint32(0);
        var secLow32 = view.getUint32(4);
        var sec = (nsec30AndSecHigh2 & 3) * 4294967296 + secLow32;
        var nsec = nsec30AndSecHigh2 >>> 2;
        return {sec, nsec};
      }
      case 12: {
        var sec = getInt64(view, 4);
        var nsec = view.getUint32(0);
        return {sec, nsec};
      }
      default:
        throw new Error("Unrecognized data size for timestamp: " + data.length);
    }
  }
  function decodeTimestampExtension(data) {
    var timeSpec = decodeTimestampToTimeSpec(data);
    return new Date(timeSpec.sec * 1e3 + timeSpec.nsec / 1e6);
  }
  var timestampExtension = {
    type: EXT_TIMESTAMP,
    encode: encodeTimestampExtension,
    decode: decodeTimestampExtension
  };

  // node_modules/.pnpm/@msgpack/msgpack@2.3.0/node_modules/@msgpack/msgpack/dist.es5+esm/ExtensionCodec.mjs
  var ExtensionCodec = function() {
    function ExtensionCodec4() {
      this.builtInEncoders = [];
      this.builtInDecoders = [];
      this.encoders = [];
      this.decoders = [];
      this.register(timestampExtension);
    }
    ExtensionCodec4.prototype.register = function(_a) {
      var type = _a.type, encode2 = _a.encode, decode2 = _a.decode;
      if (type >= 0) {
        this.encoders[type] = encode2;
        this.decoders[type] = decode2;
      } else {
        var index = 1 + type;
        this.builtInEncoders[index] = encode2;
        this.builtInDecoders[index] = decode2;
      }
    };
    ExtensionCodec4.prototype.tryToEncode = function(object, context) {
      for (var i = 0; i < this.builtInEncoders.length; i++) {
        var encoder = this.builtInEncoders[i];
        if (encoder != null) {
          var data = encoder(object, context);
          if (data != null) {
            var type = -1 - i;
            return new ExtData(type, data);
          }
        }
      }
      for (var i = 0; i < this.encoders.length; i++) {
        var encoder = this.encoders[i];
        if (encoder != null) {
          var data = encoder(object, context);
          if (data != null) {
            var type = i;
            return new ExtData(type, data);
          }
        }
      }
      if (object instanceof ExtData) {
        return object;
      }
      return null;
    };
    ExtensionCodec4.prototype.decode = function(data, type, context) {
      var decoder = type < 0 ? this.builtInDecoders[-1 - type] : this.decoders[type];
      if (decoder) {
        return decoder(data, type, context);
      } else {
        return new ExtData(type, data);
      }
    };
    ExtensionCodec4.defaultCodec = new ExtensionCodec4();
    return ExtensionCodec4;
  }();

  // node_modules/.pnpm/@msgpack/msgpack@2.3.0/node_modules/@msgpack/msgpack/dist.es5+esm/utils/typedArrays.mjs
  function ensureUint8Array(buffer2) {
    if (buffer2 instanceof Uint8Array) {
      return buffer2;
    } else if (ArrayBuffer.isView(buffer2)) {
      return new Uint8Array(buffer2.buffer, buffer2.byteOffset, buffer2.byteLength);
    } else if (buffer2 instanceof ArrayBuffer) {
      return new Uint8Array(buffer2);
    } else {
      return Uint8Array.from(buffer2);
    }
  }
  function createDataView(buffer2) {
    if (buffer2 instanceof ArrayBuffer) {
      return new DataView(buffer2);
    }
    var bufferView = ensureUint8Array(buffer2);
    return new DataView(bufferView.buffer, bufferView.byteOffset, bufferView.byteLength);
  }

  // node_modules/.pnpm/@msgpack/msgpack@2.3.0/node_modules/@msgpack/msgpack/dist.es5+esm/Encoder.mjs
  var DEFAULT_MAX_DEPTH = 100;
  var DEFAULT_INITIAL_BUFFER_SIZE = 2048;
  var Encoder = function() {
    function Encoder3(extensionCodec, context, maxDepth, initialBufferSize, sortKeys, forceFloat32, ignoreUndefined, forceIntegerToFloat) {
      if (extensionCodec === void 0) {
        extensionCodec = ExtensionCodec.defaultCodec;
      }
      if (context === void 0) {
        context = void 0;
      }
      if (maxDepth === void 0) {
        maxDepth = DEFAULT_MAX_DEPTH;
      }
      if (initialBufferSize === void 0) {
        initialBufferSize = DEFAULT_INITIAL_BUFFER_SIZE;
      }
      if (sortKeys === void 0) {
        sortKeys = false;
      }
      if (forceFloat32 === void 0) {
        forceFloat32 = false;
      }
      if (ignoreUndefined === void 0) {
        ignoreUndefined = false;
      }
      if (forceIntegerToFloat === void 0) {
        forceIntegerToFloat = false;
      }
      this.extensionCodec = extensionCodec;
      this.context = context;
      this.maxDepth = maxDepth;
      this.initialBufferSize = initialBufferSize;
      this.sortKeys = sortKeys;
      this.forceFloat32 = forceFloat32;
      this.ignoreUndefined = ignoreUndefined;
      this.forceIntegerToFloat = forceIntegerToFloat;
      this.pos = 0;
      this.view = new DataView(new ArrayBuffer(this.initialBufferSize));
      this.bytes = new Uint8Array(this.view.buffer);
    }
    Encoder3.prototype.getUint8Array = function() {
      return this.bytes.subarray(0, this.pos);
    };
    Encoder3.prototype.reinitializeState = function() {
      this.pos = 0;
    };
    Encoder3.prototype.encode = function(object) {
      this.reinitializeState();
      this.doEncode(object, 1);
      return this.getUint8Array();
    };
    Encoder3.prototype.doEncode = function(object, depth) {
      if (depth > this.maxDepth) {
        throw new Error("Too deep objects in depth " + depth);
      }
      if (object == null) {
        this.encodeNil();
      } else if (typeof object === "boolean") {
        this.encodeBoolean(object);
      } else if (typeof object === "number") {
        this.encodeNumber(object);
      } else if (typeof object === "string") {
        this.encodeString(object);
      } else {
        this.encodeObject(object, depth);
      }
    };
    Encoder3.prototype.ensureBufferSizeToWrite = function(sizeToWrite) {
      var requiredSize = this.pos + sizeToWrite;
      if (this.view.byteLength < requiredSize) {
        this.resizeBuffer(requiredSize * 2);
      }
    };
    Encoder3.prototype.resizeBuffer = function(newSize) {
      var newBuffer = new ArrayBuffer(newSize);
      var newBytes = new Uint8Array(newBuffer);
      var newView = new DataView(newBuffer);
      newBytes.set(this.bytes);
      this.view = newView;
      this.bytes = newBytes;
    };
    Encoder3.prototype.encodeNil = function() {
      this.writeU8(192);
    };
    Encoder3.prototype.encodeBoolean = function(object) {
      if (object === false) {
        this.writeU8(194);
      } else {
        this.writeU8(195);
      }
    };
    Encoder3.prototype.encodeNumber = function(object) {
      if (Number.isSafeInteger(object) && !this.forceIntegerToFloat) {
        if (object >= 0) {
          if (object < 128) {
            this.writeU8(object);
          } else if (object < 256) {
            this.writeU8(204);
            this.writeU8(object);
          } else if (object < 65536) {
            this.writeU8(205);
            this.writeU16(object);
          } else if (object < 4294967296) {
            this.writeU8(206);
            this.writeU32(object);
          } else {
            this.writeU8(207);
            this.writeU64(object);
          }
        } else {
          if (object >= -32) {
            this.writeU8(224 | object + 32);
          } else if (object >= -128) {
            this.writeU8(208);
            this.writeI8(object);
          } else if (object >= -32768) {
            this.writeU8(209);
            this.writeI16(object);
          } else if (object >= -2147483648) {
            this.writeU8(210);
            this.writeI32(object);
          } else {
            this.writeU8(211);
            this.writeI64(object);
          }
        }
      } else {
        if (this.forceFloat32) {
          this.writeU8(202);
          this.writeF32(object);
        } else {
          this.writeU8(203);
          this.writeF64(object);
        }
      }
    };
    Encoder3.prototype.writeStringHeader = function(byteLength) {
      if (byteLength < 32) {
        this.writeU8(160 + byteLength);
      } else if (byteLength < 256) {
        this.writeU8(217);
        this.writeU8(byteLength);
      } else if (byteLength < 65536) {
        this.writeU8(218);
        this.writeU16(byteLength);
      } else if (byteLength < 4294967296) {
        this.writeU8(219);
        this.writeU32(byteLength);
      } else {
        throw new Error("Too long string: " + byteLength + " bytes in UTF-8");
      }
    };
    Encoder3.prototype.encodeString = function(object) {
      var maxHeaderSize = 1 + 4;
      var strLength = object.length;
      if (strLength > TEXT_ENCODER_THRESHOLD) {
        var byteLength = utf8Count(object);
        this.ensureBufferSizeToWrite(maxHeaderSize + byteLength);
        this.writeStringHeader(byteLength);
        utf8EncodeTE(object, this.bytes, this.pos);
        this.pos += byteLength;
      } else {
        var byteLength = utf8Count(object);
        this.ensureBufferSizeToWrite(maxHeaderSize + byteLength);
        this.writeStringHeader(byteLength);
        utf8EncodeJs(object, this.bytes, this.pos);
        this.pos += byteLength;
      }
    };
    Encoder3.prototype.encodeObject = function(object, depth) {
      var ext = this.extensionCodec.tryToEncode(object, this.context);
      if (ext != null) {
        this.encodeExtension(ext);
      } else if (Array.isArray(object)) {
        this.encodeArray(object, depth);
      } else if (ArrayBuffer.isView(object)) {
        this.encodeBinary(object);
      } else if (typeof object === "object") {
        this.encodeMap(object, depth);
      } else {
        throw new Error("Unrecognized object: " + Object.prototype.toString.apply(object));
      }
    };
    Encoder3.prototype.encodeBinary = function(object) {
      var size = object.byteLength;
      if (size < 256) {
        this.writeU8(196);
        this.writeU8(size);
      } else if (size < 65536) {
        this.writeU8(197);
        this.writeU16(size);
      } else if (size < 4294967296) {
        this.writeU8(198);
        this.writeU32(size);
      } else {
        throw new Error("Too large binary: " + size);
      }
      var bytes = ensureUint8Array(object);
      this.writeU8a(bytes);
    };
    Encoder3.prototype.encodeArray = function(object, depth) {
      var size = object.length;
      if (size < 16) {
        this.writeU8(144 + size);
      } else if (size < 65536) {
        this.writeU8(220);
        this.writeU16(size);
      } else if (size < 4294967296) {
        this.writeU8(221);
        this.writeU32(size);
      } else {
        throw new Error("Too large array: " + size);
      }
      for (var _i = 0, object_1 = object; _i < object_1.length; _i++) {
        var item = object_1[_i];
        this.doEncode(item, depth + 1);
      }
    };
    Encoder3.prototype.countWithoutUndefined = function(object, keys) {
      var count = 0;
      for (var _i = 0, keys_1 = keys; _i < keys_1.length; _i++) {
        var key = keys_1[_i];
        if (object[key] !== void 0) {
          count++;
        }
      }
      return count;
    };
    Encoder3.prototype.encodeMap = function(object, depth) {
      var keys = Object.keys(object);
      if (this.sortKeys) {
        keys.sort();
      }
      var size = this.ignoreUndefined ? this.countWithoutUndefined(object, keys) : keys.length;
      if (size < 16) {
        this.writeU8(128 + size);
      } else if (size < 65536) {
        this.writeU8(222);
        this.writeU16(size);
      } else if (size < 4294967296) {
        this.writeU8(223);
        this.writeU32(size);
      } else {
        throw new Error("Too large map object: " + size);
      }
      for (var _i = 0, keys_2 = keys; _i < keys_2.length; _i++) {
        var key = keys_2[_i];
        var value = object[key];
        if (!(this.ignoreUndefined && value === void 0)) {
          this.encodeString(key);
          this.doEncode(value, depth + 1);
        }
      }
    };
    Encoder3.prototype.encodeExtension = function(ext) {
      var size = ext.data.length;
      if (size === 1) {
        this.writeU8(212);
      } else if (size === 2) {
        this.writeU8(213);
      } else if (size === 4) {
        this.writeU8(214);
      } else if (size === 8) {
        this.writeU8(215);
      } else if (size === 16) {
        this.writeU8(216);
      } else if (size < 256) {
        this.writeU8(199);
        this.writeU8(size);
      } else if (size < 65536) {
        this.writeU8(200);
        this.writeU16(size);
      } else if (size < 4294967296) {
        this.writeU8(201);
        this.writeU32(size);
      } else {
        throw new Error("Too large extension object: " + size);
      }
      this.writeI8(ext.type);
      this.writeU8a(ext.data);
    };
    Encoder3.prototype.writeU8 = function(value) {
      this.ensureBufferSizeToWrite(1);
      this.view.setUint8(this.pos, value);
      this.pos++;
    };
    Encoder3.prototype.writeU8a = function(values) {
      var size = values.length;
      this.ensureBufferSizeToWrite(size);
      this.bytes.set(values, this.pos);
      this.pos += size;
    };
    Encoder3.prototype.writeI8 = function(value) {
      this.ensureBufferSizeToWrite(1);
      this.view.setInt8(this.pos, value);
      this.pos++;
    };
    Encoder3.prototype.writeU16 = function(value) {
      this.ensureBufferSizeToWrite(2);
      this.view.setUint16(this.pos, value);
      this.pos += 2;
    };
    Encoder3.prototype.writeI16 = function(value) {
      this.ensureBufferSizeToWrite(2);
      this.view.setInt16(this.pos, value);
      this.pos += 2;
    };
    Encoder3.prototype.writeU32 = function(value) {
      this.ensureBufferSizeToWrite(4);
      this.view.setUint32(this.pos, value);
      this.pos += 4;
    };
    Encoder3.prototype.writeI32 = function(value) {
      this.ensureBufferSizeToWrite(4);
      this.view.setInt32(this.pos, value);
      this.pos += 4;
    };
    Encoder3.prototype.writeF32 = function(value) {
      this.ensureBufferSizeToWrite(4);
      this.view.setFloat32(this.pos, value);
      this.pos += 4;
    };
    Encoder3.prototype.writeF64 = function(value) {
      this.ensureBufferSizeToWrite(8);
      this.view.setFloat64(this.pos, value);
      this.pos += 8;
    };
    Encoder3.prototype.writeU64 = function(value) {
      this.ensureBufferSizeToWrite(8);
      setUint64(this.view, this.pos, value);
      this.pos += 8;
    };
    Encoder3.prototype.writeI64 = function(value) {
      this.ensureBufferSizeToWrite(8);
      setInt64(this.view, this.pos, value);
      this.pos += 8;
    };
    return Encoder3;
  }();

  // node_modules/.pnpm/@msgpack/msgpack@2.3.0/node_modules/@msgpack/msgpack/dist.es5+esm/encode.mjs
  var defaultEncodeOptions = {};
  function encode(value, options) {
    if (options === void 0) {
      options = defaultEncodeOptions;
    }
    var encoder = new Encoder(options.extensionCodec, options.context, options.maxDepth, options.initialBufferSize, options.sortKeys, options.forceFloat32, options.ignoreUndefined, options.forceIntegerToFloat);
    return encoder.encode(value);
  }

  // node_modules/.pnpm/@msgpack/msgpack@2.3.0/node_modules/@msgpack/msgpack/dist.es5+esm/utils/prettyByte.mjs
  function prettyByte(byte) {
    return (byte < 0 ? "-" : "") + "0x" + Math.abs(byte).toString(16).padStart(2, "0");
  }

  // node_modules/.pnpm/@msgpack/msgpack@2.3.0/node_modules/@msgpack/msgpack/dist.es5+esm/CachedKeyDecoder.mjs
  var DEFAULT_MAX_KEY_LENGTH = 16;
  var DEFAULT_MAX_LENGTH_PER_KEY = 16;
  var CachedKeyDecoder = function() {
    function CachedKeyDecoder3(maxKeyLength, maxLengthPerKey) {
      if (maxKeyLength === void 0) {
        maxKeyLength = DEFAULT_MAX_KEY_LENGTH;
      }
      if (maxLengthPerKey === void 0) {
        maxLengthPerKey = DEFAULT_MAX_LENGTH_PER_KEY;
      }
      this.maxKeyLength = maxKeyLength;
      this.maxLengthPerKey = maxLengthPerKey;
      this.hit = 0;
      this.miss = 0;
      this.caches = [];
      for (var i = 0; i < this.maxKeyLength; i++) {
        this.caches.push([]);
      }
    }
    CachedKeyDecoder3.prototype.canBeCached = function(byteLength) {
      return byteLength > 0 && byteLength <= this.maxKeyLength;
    };
    CachedKeyDecoder3.prototype.get = function(bytes, inputOffset, byteLength) {
      var records = this.caches[byteLength - 1];
      var recordsLength = records.length;
      FIND_CHUNK:
        for (var i = 0; i < recordsLength; i++) {
          var record = records[i];
          var recordBytes = record.bytes;
          for (var j = 0; j < byteLength; j++) {
            if (recordBytes[j] !== bytes[inputOffset + j]) {
              continue FIND_CHUNK;
            }
          }
          return record.value;
        }
      return null;
    };
    CachedKeyDecoder3.prototype.store = function(bytes, value) {
      var records = this.caches[bytes.length - 1];
      var record = {bytes, value};
      if (records.length >= this.maxLengthPerKey) {
        records[Math.random() * records.length | 0] = record;
      } else {
        records.push(record);
      }
    };
    CachedKeyDecoder3.prototype.decode = function(bytes, inputOffset, byteLength) {
      var cachedValue = this.get(bytes, inputOffset, byteLength);
      if (cachedValue != null) {
        this.hit++;
        return cachedValue;
      }
      this.miss++;
      var value = utf8DecodeJs(bytes, inputOffset, byteLength);
      var slicedCopyOfBytes = Uint8Array.prototype.slice.call(bytes, inputOffset, inputOffset + byteLength);
      this.store(slicedCopyOfBytes, value);
      return value;
    };
    return CachedKeyDecoder3;
  }();

  // node_modules/.pnpm/@msgpack/msgpack@2.3.0/node_modules/@msgpack/msgpack/dist.es5+esm/Decoder.mjs
  var __awaiter = function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  var __generator = function(thisArg, body) {
    var _ = {label: 0, sent: function() {
      if (t[0] & 1)
        throw t[1];
      return t[1];
    }, trys: [], ops: []}, f, y, t, g;
    return g = {next: verb(0), throw: verb(1), return: verb(2)}, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
      return this;
    }), g;
    function verb(n) {
      return function(v) {
        return step([n, v]);
      };
    }
    function step(op) {
      if (f)
        throw new TypeError("Generator is already executing.");
      while (_)
        try {
          if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
            return t;
          if (y = 0, t)
            op = [op[0] & 2, t.value];
          switch (op[0]) {
            case 0:
            case 1:
              t = op;
              break;
            case 4:
              _.label++;
              return {value: op[1], done: false};
            case 5:
              _.label++;
              y = op[1];
              op = [0];
              continue;
            case 7:
              op = _.ops.pop();
              _.trys.pop();
              continue;
            default:
              if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                _ = 0;
                continue;
              }
              if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
                _.label = op[1];
                break;
              }
              if (op[0] === 6 && _.label < t[1]) {
                _.label = t[1];
                t = op;
                break;
              }
              if (t && _.label < t[2]) {
                _.label = t[2];
                _.ops.push(op);
                break;
              }
              if (t[2])
                _.ops.pop();
              _.trys.pop();
              continue;
          }
          op = body.call(thisArg, _);
        } catch (e) {
          op = [6, e];
          y = 0;
        } finally {
          f = t = 0;
        }
      if (op[0] & 5)
        throw op[1];
      return {value: op[0] ? op[1] : void 0, done: true};
    }
  };
  var __asyncValues = function(o) {
    if (!Symbol.asyncIterator)
      throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function() {
      return this;
    }, i);
    function verb(n) {
      i[n] = o[n] && function(v) {
        return new Promise(function(resolve, reject) {
          v = o[n](v), settle(resolve, reject, v.done, v.value);
        });
      };
    }
    function settle(resolve, reject, d, v) {
      Promise.resolve(v).then(function(v2) {
        resolve({value: v2, done: d});
      }, reject);
    }
  };
  var __await = function(v) {
    return this instanceof __await ? (this.v = v, this) : new __await(v);
  };
  var __asyncGenerator = function(thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator)
      throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function() {
      return this;
    }, i;
    function verb(n) {
      if (g[n])
        i[n] = function(v) {
          return new Promise(function(a, b) {
            q.push([n, v, a, b]) > 1 || resume(n, v);
          });
        };
    }
    function resume(n, v) {
      try {
        step(g[n](v));
      } catch (e) {
        settle(q[0][3], e);
      }
    }
    function step(r) {
      r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r);
    }
    function fulfill(value) {
      resume("next", value);
    }
    function reject(value) {
      resume("throw", value);
    }
    function settle(f, v) {
      if (f(v), q.shift(), q.length)
        resume(q[0][0], q[0][1]);
    }
  };
  var isValidMapKeyType = function(key) {
    var keyType = typeof key;
    return keyType === "string" || keyType === "number";
  };
  var HEAD_BYTE_REQUIRED = -1;
  var EMPTY_VIEW = new DataView(new ArrayBuffer(0));
  var EMPTY_BYTES = new Uint8Array(EMPTY_VIEW.buffer);
  var DataViewIndexOutOfBoundsError = function() {
    try {
      EMPTY_VIEW.getInt8(0);
    } catch (e) {
      return e.constructor;
    }
    throw new Error("never reached");
  }();
  var MORE_DATA = new DataViewIndexOutOfBoundsError("Insufficient data");
  var DEFAULT_MAX_LENGTH = 4294967295;
  var sharedCachedKeyDecoder = new CachedKeyDecoder();
  var Decoder = function() {
    function Decoder3(extensionCodec, context, maxStrLength, maxBinLength, maxArrayLength, maxMapLength, maxExtLength, keyDecoder) {
      if (extensionCodec === void 0) {
        extensionCodec = ExtensionCodec.defaultCodec;
      }
      if (context === void 0) {
        context = void 0;
      }
      if (maxStrLength === void 0) {
        maxStrLength = DEFAULT_MAX_LENGTH;
      }
      if (maxBinLength === void 0) {
        maxBinLength = DEFAULT_MAX_LENGTH;
      }
      if (maxArrayLength === void 0) {
        maxArrayLength = DEFAULT_MAX_LENGTH;
      }
      if (maxMapLength === void 0) {
        maxMapLength = DEFAULT_MAX_LENGTH;
      }
      if (maxExtLength === void 0) {
        maxExtLength = DEFAULT_MAX_LENGTH;
      }
      if (keyDecoder === void 0) {
        keyDecoder = sharedCachedKeyDecoder;
      }
      this.extensionCodec = extensionCodec;
      this.context = context;
      this.maxStrLength = maxStrLength;
      this.maxBinLength = maxBinLength;
      this.maxArrayLength = maxArrayLength;
      this.maxMapLength = maxMapLength;
      this.maxExtLength = maxExtLength;
      this.keyDecoder = keyDecoder;
      this.totalPos = 0;
      this.pos = 0;
      this.view = EMPTY_VIEW;
      this.bytes = EMPTY_BYTES;
      this.headByte = HEAD_BYTE_REQUIRED;
      this.stack = [];
    }
    Decoder3.prototype.reinitializeState = function() {
      this.totalPos = 0;
      this.headByte = HEAD_BYTE_REQUIRED;
    };
    Decoder3.prototype.setBuffer = function(buffer2) {
      this.bytes = ensureUint8Array(buffer2);
      this.view = createDataView(this.bytes);
      this.pos = 0;
    };
    Decoder3.prototype.appendBuffer = function(buffer2) {
      if (this.headByte === HEAD_BYTE_REQUIRED && !this.hasRemaining()) {
        this.setBuffer(buffer2);
      } else {
        var remainingData = this.bytes.subarray(this.pos);
        var newData = ensureUint8Array(buffer2);
        var concated = new Uint8Array(remainingData.length + newData.length);
        concated.set(remainingData);
        concated.set(newData, remainingData.length);
        this.setBuffer(concated);
      }
    };
    Decoder3.prototype.hasRemaining = function(size) {
      if (size === void 0) {
        size = 1;
      }
      return this.view.byteLength - this.pos >= size;
    };
    Decoder3.prototype.createExtraByteError = function(posToShow) {
      var _a = this, view = _a.view, pos = _a.pos;
      return new RangeError("Extra " + (view.byteLength - pos) + " of " + view.byteLength + " byte(s) found at buffer[" + posToShow + "]");
    };
    Decoder3.prototype.decode = function(buffer2) {
      this.reinitializeState();
      this.setBuffer(buffer2);
      var object = this.doDecodeSync();
      if (this.hasRemaining()) {
        throw this.createExtraByteError(this.pos);
      }
      return object;
    };
    Decoder3.prototype.decodeAsync = function(stream) {
      var stream_1, stream_1_1;
      var e_1, _a;
      return __awaiter(this, void 0, void 0, function() {
        var decoded, object, buffer2, e_1_1, _b, headByte, pos, totalPos;
        return __generator(this, function(_c) {
          switch (_c.label) {
            case 0:
              decoded = false;
              _c.label = 1;
            case 1:
              _c.trys.push([1, 6, 7, 12]);
              stream_1 = __asyncValues(stream);
              _c.label = 2;
            case 2:
              return [4, stream_1.next()];
            case 3:
              if (!(stream_1_1 = _c.sent(), !stream_1_1.done))
                return [3, 5];
              buffer2 = stream_1_1.value;
              if (decoded) {
                throw this.createExtraByteError(this.totalPos);
              }
              this.appendBuffer(buffer2);
              try {
                object = this.doDecodeSync();
                decoded = true;
              } catch (e) {
                if (!(e instanceof DataViewIndexOutOfBoundsError)) {
                  throw e;
                }
              }
              this.totalPos += this.pos;
              _c.label = 4;
            case 4:
              return [3, 2];
            case 5:
              return [3, 12];
            case 6:
              e_1_1 = _c.sent();
              e_1 = {error: e_1_1};
              return [3, 12];
            case 7:
              _c.trys.push([7, , 10, 11]);
              if (!(stream_1_1 && !stream_1_1.done && (_a = stream_1.return)))
                return [3, 9];
              return [4, _a.call(stream_1)];
            case 8:
              _c.sent();
              _c.label = 9;
            case 9:
              return [3, 11];
            case 10:
              if (e_1)
                throw e_1.error;
              return [7];
            case 11:
              return [7];
            case 12:
              if (decoded) {
                if (this.hasRemaining()) {
                  throw this.createExtraByteError(this.totalPos);
                }
                return [2, object];
              }
              _b = this, headByte = _b.headByte, pos = _b.pos, totalPos = _b.totalPos;
              throw new RangeError("Insufficient data in parsing " + prettyByte(headByte) + " at " + totalPos + " (" + pos + " in the current buffer)");
          }
        });
      });
    };
    Decoder3.prototype.decodeArrayStream = function(stream) {
      return this.decodeMultiAsync(stream, true);
    };
    Decoder3.prototype.decodeStream = function(stream) {
      return this.decodeMultiAsync(stream, false);
    };
    Decoder3.prototype.decodeMultiAsync = function(stream, isArray) {
      return __asyncGenerator(this, arguments, function decodeMultiAsync_1() {
        var isArrayHeaderRequired, arrayItemsLeft, stream_2, stream_2_1, buffer2, e_2, e_3_1;
        var e_3, _a;
        return __generator(this, function(_b) {
          switch (_b.label) {
            case 0:
              isArrayHeaderRequired = isArray;
              arrayItemsLeft = -1;
              _b.label = 1;
            case 1:
              _b.trys.push([1, 13, 14, 19]);
              stream_2 = __asyncValues(stream);
              _b.label = 2;
            case 2:
              return [4, __await(stream_2.next())];
            case 3:
              if (!(stream_2_1 = _b.sent(), !stream_2_1.done))
                return [3, 12];
              buffer2 = stream_2_1.value;
              if (isArray && arrayItemsLeft === 0) {
                throw this.createExtraByteError(this.totalPos);
              }
              this.appendBuffer(buffer2);
              if (isArrayHeaderRequired) {
                arrayItemsLeft = this.readArraySize();
                isArrayHeaderRequired = false;
                this.complete();
              }
              _b.label = 4;
            case 4:
              _b.trys.push([4, 9, , 10]);
              _b.label = 5;
            case 5:
              if (false)
                return [3, 8];
              return [4, __await(this.doDecodeSync())];
            case 6:
              return [4, _b.sent()];
            case 7:
              _b.sent();
              if (--arrayItemsLeft === 0) {
                return [3, 8];
              }
              return [3, 5];
            case 8:
              return [3, 10];
            case 9:
              e_2 = _b.sent();
              if (!(e_2 instanceof DataViewIndexOutOfBoundsError)) {
                throw e_2;
              }
              return [3, 10];
            case 10:
              this.totalPos += this.pos;
              _b.label = 11;
            case 11:
              return [3, 2];
            case 12:
              return [3, 19];
            case 13:
              e_3_1 = _b.sent();
              e_3 = {error: e_3_1};
              return [3, 19];
            case 14:
              _b.trys.push([14, , 17, 18]);
              if (!(stream_2_1 && !stream_2_1.done && (_a = stream_2.return)))
                return [3, 16];
              return [4, __await(_a.call(stream_2))];
            case 15:
              _b.sent();
              _b.label = 16;
            case 16:
              return [3, 18];
            case 17:
              if (e_3)
                throw e_3.error;
              return [7];
            case 18:
              return [7];
            case 19:
              return [2];
          }
        });
      });
    };
    Decoder3.prototype.doDecodeSync = function() {
      DECODE:
        while (true) {
          var headByte = this.readHeadByte();
          var object = void 0;
          if (headByte >= 224) {
            object = headByte - 256;
          } else if (headByte < 192) {
            if (headByte < 128) {
              object = headByte;
            } else if (headByte < 144) {
              var size = headByte - 128;
              if (size !== 0) {
                this.pushMapState(size);
                this.complete();
                continue DECODE;
              } else {
                object = {};
              }
            } else if (headByte < 160) {
              var size = headByte - 144;
              if (size !== 0) {
                this.pushArrayState(size);
                this.complete();
                continue DECODE;
              } else {
                object = [];
              }
            } else {
              var byteLength = headByte - 160;
              object = this.decodeUtf8String(byteLength, 0);
            }
          } else if (headByte === 192) {
            object = null;
          } else if (headByte === 194) {
            object = false;
          } else if (headByte === 195) {
            object = true;
          } else if (headByte === 202) {
            object = this.readF32();
          } else if (headByte === 203) {
            object = this.readF64();
          } else if (headByte === 204) {
            object = this.readU8();
          } else if (headByte === 205) {
            object = this.readU16();
          } else if (headByte === 206) {
            object = this.readU32();
          } else if (headByte === 207) {
            object = this.readU64();
          } else if (headByte === 208) {
            object = this.readI8();
          } else if (headByte === 209) {
            object = this.readI16();
          } else if (headByte === 210) {
            object = this.readI32();
          } else if (headByte === 211) {
            object = this.readI64();
          } else if (headByte === 217) {
            var byteLength = this.lookU8();
            object = this.decodeUtf8String(byteLength, 1);
          } else if (headByte === 218) {
            var byteLength = this.lookU16();
            object = this.decodeUtf8String(byteLength, 2);
          } else if (headByte === 219) {
            var byteLength = this.lookU32();
            object = this.decodeUtf8String(byteLength, 4);
          } else if (headByte === 220) {
            var size = this.readU16();
            if (size !== 0) {
              this.pushArrayState(size);
              this.complete();
              continue DECODE;
            } else {
              object = [];
            }
          } else if (headByte === 221) {
            var size = this.readU32();
            if (size !== 0) {
              this.pushArrayState(size);
              this.complete();
              continue DECODE;
            } else {
              object = [];
            }
          } else if (headByte === 222) {
            var size = this.readU16();
            if (size !== 0) {
              this.pushMapState(size);
              this.complete();
              continue DECODE;
            } else {
              object = {};
            }
          } else if (headByte === 223) {
            var size = this.readU32();
            if (size !== 0) {
              this.pushMapState(size);
              this.complete();
              continue DECODE;
            } else {
              object = {};
            }
          } else if (headByte === 196) {
            var size = this.lookU8();
            object = this.decodeBinary(size, 1);
          } else if (headByte === 197) {
            var size = this.lookU16();
            object = this.decodeBinary(size, 2);
          } else if (headByte === 198) {
            var size = this.lookU32();
            object = this.decodeBinary(size, 4);
          } else if (headByte === 212) {
            object = this.decodeExtension(1, 0);
          } else if (headByte === 213) {
            object = this.decodeExtension(2, 0);
          } else if (headByte === 214) {
            object = this.decodeExtension(4, 0);
          } else if (headByte === 215) {
            object = this.decodeExtension(8, 0);
          } else if (headByte === 216) {
            object = this.decodeExtension(16, 0);
          } else if (headByte === 199) {
            var size = this.lookU8();
            object = this.decodeExtension(size, 1);
          } else if (headByte === 200) {
            var size = this.lookU16();
            object = this.decodeExtension(size, 2);
          } else if (headByte === 201) {
            var size = this.lookU32();
            object = this.decodeExtension(size, 4);
          } else {
            throw new Error("Unrecognized type byte: " + prettyByte(headByte));
          }
          this.complete();
          var stack = this.stack;
          while (stack.length > 0) {
            var state = stack[stack.length - 1];
            if (state.type === 0) {
              state.array[state.position] = object;
              state.position++;
              if (state.position === state.size) {
                stack.pop();
                object = state.array;
              } else {
                continue DECODE;
              }
            } else if (state.type === 1) {
              if (!isValidMapKeyType(object)) {
                throw new Error("The type of key must be string or number but " + typeof object);
              }
              state.key = object;
              state.type = 2;
              continue DECODE;
            } else {
              state.map[state.key] = object;
              state.readCount++;
              if (state.readCount === state.size) {
                stack.pop();
                object = state.map;
              } else {
                state.key = null;
                state.type = 1;
                continue DECODE;
              }
            }
          }
          return object;
        }
    };
    Decoder3.prototype.readHeadByte = function() {
      if (this.headByte === HEAD_BYTE_REQUIRED) {
        this.headByte = this.readU8();
      }
      return this.headByte;
    };
    Decoder3.prototype.complete = function() {
      this.headByte = HEAD_BYTE_REQUIRED;
    };
    Decoder3.prototype.readArraySize = function() {
      var headByte = this.readHeadByte();
      switch (headByte) {
        case 220:
          return this.readU16();
        case 221:
          return this.readU32();
        default: {
          if (headByte < 160) {
            return headByte - 144;
          } else {
            throw new Error("Unrecognized array type byte: " + prettyByte(headByte));
          }
        }
      }
    };
    Decoder3.prototype.pushMapState = function(size) {
      if (size > this.maxMapLength) {
        throw new Error("Max length exceeded: map length (" + size + ") > maxMapLengthLength (" + this.maxMapLength + ")");
      }
      this.stack.push({
        type: 1,
        size,
        key: null,
        readCount: 0,
        map: {}
      });
    };
    Decoder3.prototype.pushArrayState = function(size) {
      if (size > this.maxArrayLength) {
        throw new Error("Max length exceeded: array length (" + size + ") > maxArrayLength (" + this.maxArrayLength + ")");
      }
      this.stack.push({
        type: 0,
        size,
        array: new Array(size),
        position: 0
      });
    };
    Decoder3.prototype.decodeUtf8String = function(byteLength, headerOffset) {
      var _a;
      if (byteLength > this.maxStrLength) {
        throw new Error("Max length exceeded: UTF-8 byte length (" + byteLength + ") > maxStrLength (" + this.maxStrLength + ")");
      }
      if (this.bytes.byteLength < this.pos + headerOffset + byteLength) {
        throw MORE_DATA;
      }
      var offset = this.pos + headerOffset;
      var object;
      if (this.stateIsMapKey() && ((_a = this.keyDecoder) === null || _a === void 0 ? void 0 : _a.canBeCached(byteLength))) {
        object = this.keyDecoder.decode(this.bytes, offset, byteLength);
      } else if (byteLength > TEXT_DECODER_THRESHOLD) {
        object = utf8DecodeTD(this.bytes, offset, byteLength);
      } else {
        object = utf8DecodeJs(this.bytes, offset, byteLength);
      }
      this.pos += headerOffset + byteLength;
      return object;
    };
    Decoder3.prototype.stateIsMapKey = function() {
      if (this.stack.length > 0) {
        var state = this.stack[this.stack.length - 1];
        return state.type === 1;
      }
      return false;
    };
    Decoder3.prototype.decodeBinary = function(byteLength, headOffset) {
      if (byteLength > this.maxBinLength) {
        throw new Error("Max length exceeded: bin length (" + byteLength + ") > maxBinLength (" + this.maxBinLength + ")");
      }
      if (!this.hasRemaining(byteLength + headOffset)) {
        throw MORE_DATA;
      }
      var offset = this.pos + headOffset;
      var object = this.bytes.subarray(offset, offset + byteLength);
      this.pos += headOffset + byteLength;
      return object;
    };
    Decoder3.prototype.decodeExtension = function(size, headOffset) {
      if (size > this.maxExtLength) {
        throw new Error("Max length exceeded: ext length (" + size + ") > maxExtLength (" + this.maxExtLength + ")");
      }
      var extType = this.view.getInt8(this.pos + headOffset);
      var data = this.decodeBinary(size, headOffset + 1);
      return this.extensionCodec.decode(data, extType, this.context);
    };
    Decoder3.prototype.lookU8 = function() {
      return this.view.getUint8(this.pos);
    };
    Decoder3.prototype.lookU16 = function() {
      return this.view.getUint16(this.pos);
    };
    Decoder3.prototype.lookU32 = function() {
      return this.view.getUint32(this.pos);
    };
    Decoder3.prototype.readU8 = function() {
      var value = this.view.getUint8(this.pos);
      this.pos++;
      return value;
    };
    Decoder3.prototype.readI8 = function() {
      var value = this.view.getInt8(this.pos);
      this.pos++;
      return value;
    };
    Decoder3.prototype.readU16 = function() {
      var value = this.view.getUint16(this.pos);
      this.pos += 2;
      return value;
    };
    Decoder3.prototype.readI16 = function() {
      var value = this.view.getInt16(this.pos);
      this.pos += 2;
      return value;
    };
    Decoder3.prototype.readU32 = function() {
      var value = this.view.getUint32(this.pos);
      this.pos += 4;
      return value;
    };
    Decoder3.prototype.readI32 = function() {
      var value = this.view.getInt32(this.pos);
      this.pos += 4;
      return value;
    };
    Decoder3.prototype.readU64 = function() {
      var value = getUint64(this.view, this.pos);
      this.pos += 8;
      return value;
    };
    Decoder3.prototype.readI64 = function() {
      var value = getInt64(this.view, this.pos);
      this.pos += 8;
      return value;
    };
    Decoder3.prototype.readF32 = function() {
      var value = this.view.getFloat32(this.pos);
      this.pos += 4;
      return value;
    };
    Decoder3.prototype.readF64 = function() {
      var value = this.view.getFloat64(this.pos);
      this.pos += 8;
      return value;
    };
    return Decoder3;
  }();

  // node_modules/.pnpm/@msgpack/msgpack@2.3.0/node_modules/@msgpack/msgpack/dist.es5+esm/decode.mjs
  var defaultDecodeOptions = {};
  function decode(buffer2, options) {
    if (options === void 0) {
      options = defaultDecodeOptions;
    }
    var decoder = new Decoder(options.extensionCodec, options.context, options.maxStrLength, options.maxBinLength, options.maxArrayLength, options.maxMapLength, options.maxExtLength);
    return decoder.decode(buffer2);
  }

  // test/index.ts
  var {Integer, Boolean, Number: Number2, String: String2} = Bunker_default;
  var bunker = new Bunker_default(sample_default, {
    zero: Integer,
    one: Integer,
    true: Boolean,
    false: Boolean,
    infinity: Number2,
    "-Infinity": Number2,
    int: Integer,
    double: Number2,
    string: String2
  });
  console.time("Json stringify");
  var json = JSON.stringify(sample_default);
  console.timeEnd("Json stringify");
  console.time("Bunker save");
  var buffer = bunker.save();
  console.timeEnd("Bunker save");
  console.time("MessagePack encode");
  var message = encode(sample_default);
  console.timeEnd("MessagePack encode");
  console.log("Json size :", json.length);
  console.log("Bunker size :", buffer.length);
  console.log("Message size :", message.length);
  console.time("Json parse");
  var objectFromJson = JSON.parse(json);
  console.timeEnd("Json parse");
  console.time("Bunker load");
  var objectFromBunker = bunker.load(buffer);
  console.timeEnd("Bunker load");
  console.time("MessagePack decode");
  var objectFromMessagePack = decode(message);
  console.timeEnd("MessagePack decode");
  console.log("---------------");
  console.log(objectFromJson);
  console.log(objectFromBunker);
  console.log(objectFromMessagePack);
})();
//# sourceMappingURL=index.js.map
