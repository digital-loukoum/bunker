## Bunker 3 binary format specifications

Bunker is a very efficient binary data format that can be used as a replacement for JSON, CSV, MessagePack or ProtocolBuffers that uses its own binary format to store data in a very compact and efficient way.

This document is the official specifications for the bunker 3 binary format.

All future versions of bunker will be compatible with this specification.

### Table of contents
1. **Data structure**

2. **Enumerations**
   - Type
   - NullableValue
   - Byte

3. **Special number formats**
   - Positive elastic integers
   - Elastic integers
   - Elastic numbers

4. **The string format**

5. **Memory and references**
   - Schema memory
   - Raw data memory

6. **Encoding schema**
   6.1. Primitive values

   6.2. Composed values
   - nullable
	- tuple
	- recall

   6.3. Objects
	- object
	- array
	- set
	- map
	- instance

7. **Encoding data**
   7.1. *Primitive values*
   - unknown
	- character
	- binary
	- boolean
	- positiveInteger
   - integer
	- integer32
	- integer64
	- bigInteger
	- float32
	- float64
	- number
	- string
	- regularExpression
	- date
	- any

   7.2. *Composed values*
   - nullable
   - tuple
   - recall

   7.3. *Objects*
   - object
   - array
   - set
   - map
   - instance

8. **Implementation tips**
   - String references

## Data structure

Bunker data is composed of two parts:

- the encoded `schema`,
- the encoded `data`.

For example, if you run `bunker(3)` you will get the following buffer: `[7, 3]`.

- `7` is the byte that indicates an integer (see the [Type](#enumeration-type) enumeration),
- `3` is the data value encoded as an [elastic integer](#elastic-integers).

## Enumerations

The following enumerations will be used throughout the whole document in the form: `EnumerationName.key`.

### Type
The `Type` enumeration is used to encode the `schema`.
```ts
enum Type {
   // primitives
   unknown = 0,
   character,
   binary,
   boolean,
   positiveInteger,
   integer32,
   integer64,
   integer,
   bigInteger,
   float32,
   float64,
   number,
   string,
   regularExpression,
   date,
   any,

   // composed values
   nullable,
   tuple,
   recall,

   // objects
   object,
   array,
   set,
   map,
   instance,

   // special types
   reference = 0xf8,
   stringReference = 0xf9,
}
```

- `Type.reference` indicates a previously encountered object,
- `Type.stringReference` indicates a previously encountered string.



### NullableValue

The `NullableValue` enumeration is used by the nullable type to indicate whether a nullable value is null, undefined, or defined.
  ```ts
  enum NullableValue {
    null = 0,
    undefined = 1,
    defined = 2,
  }
  ```


### Byte

Miscellaneous byte values.

```ts
enum Byte {
   start = 0xfe,
   stop = 0xff,
}
```

## Special number formats

Bunker use three custom binary formats to store numbers:

- `positive elastic integers` to store unsigned integers,
- `elastic integers` to store signed integers,
- `elastic numbers` to store signed decimal numbers.

They are called *elastic* because they use as few data space as possible and they can scale infinitely.

### Positive elastic integers

A positive elastic integer is made by following this simple rule:

- if the first bit of the current byte is `1`, then the next byte continue to describe the number,
- if the first bit of the current byte is `0`, then this is the last byte.

#### Example of algorithm

Let's encode the arbitrary positive integer `42345`:

1. convert it into a binary format: `1010010101101001`,
2. split it into chunks of seven bits: `0000010` `1001010` `1101001`
3. add `0` in front of the last chunk and `1` in front of the others: `10000010` `11001010` `01101001`.

This is the 3-bytes positive elastic integer representation of `42345`.

#### Examples of elastic positive integer representations

`0` -> `00000000`
`1` -> `00000001`
...
`127` -> `01111111`
`128` -> `10000001 00000000`
`129` -> `10000001 00000001`


### Elastic integers

It works the same way as positive elastic integers, except that the first bit of the first byte is used to indicate the sign:

- `1` indicates a negative integer,
- `0` indicates a positive integer.

For the first byte exclusively, it is the second bit that is the "continuation bit" and indicates whether the next byte is part of the number or not.

#### Examples of elastic integer representations

`-1` -> `10000001`
`-0` -> `10000000`
`0` -> `00000000`
`1` -> `00000001`
...
`63` -> `00111111`
`64` -> `01000001 00000000`
`-64` -> `11000001 00000000`
`-65` -> `11000001 00000001`


### Elastic numbers

Encoding a decimal number in a compact and extensible way is not easy work.

Since we humans think and write numbers in base-10, it happens it is quite often space-efficient to store a number as a string rather than as a float64.

For example, writing "1.2" is a three-bytes length only when it would take eight bytes to write it in the float64 format.

Bunker use the fact that we are humans and store all numbers into a base-10 string representation of the number using the following 4-bits characters:

`0` -> `0000`
`1` -> `0001`
`2` -> `0010`
`3` -> `0011`
`4` -> `0100`
`5` -> `0101`
`6` -> `0110`
`7` -> `0111`
`8` -> `1000`
`9` -> `1001`
`.` -> `1010`
`+` -> `1011`
`-` -> `1100`
`e` -> `1101`

The `1111` 4-bits character indicates the end of the string.

If there is an odd number of 4-bits characters, a `0000` is appended to finish the last byte.

There are special bytes:

- `1110 1011` is `infinity`,
- `1110 1100` is `-infinity`,
- `1110 0000` is `not a number`.

### Examples

`1124` -> `0001 0001 0010 0100` (encoded in 2 bytes)
`1.2` -> `0001 1010 0010 0000` (encoded in 2 bytes)
`1.324e12` -> `0001 1010 0011 0010 0100 1101 0001 0010` (encoded in 4 bytes)

## Strings

All bunker strings:

- are encoded in UTF-8,
- finish with a trailing zero.

### Examples

`"a"` -> `[97, 0]`
`"à"` -> `[195, 160, 0]`
`"的"` -> `[231, 154, 132, 0]`
`"😋"` -> `[240, 159, 152, 139, 0]`


### References

References is one of the key features of Bunker. It enables you to use circular references and it helps to reduce the encoded size.

There are three types of references:

- object references in schema,
- object references in data,
- string references in data.

Usually when you need to deal with references, you would create a dictionary which contains all your referenced objects / strings, and when you need to access the object you point to it with its index.

This approach would force you to use a dictionary on one hand, the data on the other, and finally merge the two. This is sub-optimal because it would cause need to copy-paste all the data in memory when the encoding is done.

The Bunker way is to not use a separate dictionary. Every encountered object is stored in an array and the position in the array is its index. Concretely:

- when you encode data, it means every time you encounter an object, you push it to your refererences' array, and in case you encounter the object again, you write its index as reference instead of writing again the object;
- and when you decode data, every time you encounter an object you push it to your references array, and when you encounter a reference, you retrieve the right object from this array.

Three arrays are needed: one for object references in schema, one for object references in encoded data, and one for string references in encoded data. The indexes don't mix between those three arrays.

## Specifications

### Schema specifications

- `Primitive`

  The type of the primitive is written as a byte.

  Primitive types are: unknown, null, any, boolean, character, integer, positiveInteger, bigInteger, number, string, regExp, date and reference.

  Example: for a boolean, write `Type.boolean` - which is equal to `3`. For a character, write `Type.character`, etc...

  Size (in bytes): `1`


- `Object`

  `Type.object` is written as a byte, then all the keys following by their value's schema, then a finishing `ByteIndicator.stop`.

  Examples:

  ```ts
  data: {}
  schema: [Type.object, ByteIndicator.stop]
  ```

  ```ts
  data: { foo: "bar", x: 12 }
  schema: [Type.object, "foo", Type.string, "x", Type.number, ByteIndicator.stop]
  ```


  Size: `1 + sizeof(keys) + sizeof(T)`

- `Reference<T>`

  A reference to a previously used schema object.

  `Type.reference` is written as a byte, then its index as an `positive integer`.

  Examples:

  ```ts
  data: { self: data }
  schema: [Type.object, "self", Type.reference, 0, ByteIndicator.stop]
  // we reference to 0 because the first encountered object is `data`
  // if `data` was nested inside another object, its index would not be 0
  ```

  ```ts
  data: { meta: { foo: "bar" }, referenceToMeta: data.meta }
  schema: [Type.object, "meta", Type.object, "foo", Type.string, ByteIndicator.stop, "referenceToMeta", Type.reference, 1, ByteIndicator.stop]
  // we reference to 1 because data.meta is the second encountered object
  ```

- `Nullable<T>`

  A nullable is value is a value that can be null or undefined.

  `Type.nullable` is written as a byte, then T's schema is written.

  Size: `1 + sizeof(T)`

  Examples:

  ```ts
  // nullable integer
  [Type.nullable, Type.integer]
  // nullable object with a 'foo' key with a string value
  [Type.nullable, Type.object, "foo", Type.string, ByteIndicator.stop]
  ```

- `Array<T, properties: O>`

  `Type.array` is written as a byte, then T's schema is written, then O's schema.

  Examples:

  ```ts
  data: [1, 2, 3]
  schema: [Type.array, Type.number, ByteIndicator.stop]  // the `ByteIndicator.stop` is indicating the array has no properties
  ```

  ```ts
  data: [1, 2, 3, length: 3, capacity: 12]  // this is an array with properties
  schema: [Type.array, Type.number, "length", Type.number, "capacity", Type.number, ByteIndicator.stop]
  ```

  Size: `1 + sizeof(T) + sizeof(O)`

- `Set<T, properties: O>`

  `Type.set` is written as a byte, then T's schema is written, then O's schema.

  Size: `1 + sizeof(T) + sizeof(O)`

- `Map<T, properties: O>`

  All map keys must be strings.

  `Type.map` is written as a byte, then T's schema is written, then O's schema.

  Size: `1 + sizeof(T) + sizeof(O)`

- `Record<T>`

  A `record` is similar to a map: it's a dictionary with strings a key and with T as the type of the values.

  The difference between a record and a map depends on the language. In Javascript the record is an object while a map is a Map. In C++, both are the same - except a record cannot have properties.

  `Type.record` is written as a byte, then T's schema is written.

  Size: `1 + sizeof(T)`

- `Tuple<T1, T2, T3, ...>`

  `Type.tuple` is written as a byte, then the tuple length is written as a `positive integer`, then T1's schema is written, then T2's, etc...

  Size: `1 + sizeof(length) + sizeof(T1) + sizeof(T2) + ...`


### Encoded data specifications

After the schema comes the encoded data. You no longer encode the type of the data but its value.

#### Primitive values

- `Character`

  A character is a single byte value that goes from 0 to 255.

  Size: `1`

- `Unknown`

  The `unknown` type is used to describe the values type of an empty array, empty set, empty map or empty record. It can be encoded in the schema but not in the data.

  Size: `0` (cannot happen in encoded data)

- `Boolean`

  If true, write the character `1`, else write the character `0`.

  Size: `1`

- `Integer`

  Write the integer's value as an elastic signed integer.

  Size: `1+`

- `PositiveInteger`

  Write the integer's value as an elastic unsigned integer.

  Size: `1+`

- `Number`

  Write the number's value as an elastic floating number.

  Size: `2+`

- `BigInteger`

  Write the big integer's value as an elastic signed integer.

  Size: `1+`

- `String`

  If the first byte is `ByteIndicator.reference`, then the string is a reference to a previously encountered string and the next value is a `positive integer` which indicates the index of the string in the array of encountered strings.

  Size: `1 + sizeof(index)`

  Else, write the string with a trailing zero at the end.

  Size: `1 + sizeof(string encoded as utf-8)`

  > Note: since the `ByteIndicator.reference` is a character that cannot happen in utf-8, there is no chance to mix a string with a string reference.

- `RegularExpression`

  Write the expression as a string, then the flags as a string.

  Size: `2+`

- `Date`

  Write the timestamp as an elastic signed integer.

  Size: `1+`

- `Tuple`

  Write the values of the tuple one after the other, in the same order as defined in the schema.

  Size: `0+`

- `Reference`

  Any non-primitive value or string can be a reference to a previously encountered non-primitive value or string.

  > Note: empty strings should not be referenced.

  Write `Byte.reference`, then the index of the object or the string in its corresponding array.

  Size: `2+`

- `Nullable`

  First write:

  - `NullableValue.null` is the value is null,
  - or `NullableValue.undefined` is the value is undefined,
  - or `NullableValue.defined` is the value is defined,

  and then if the value is defined, write the value.

  Size: `1` if null or undefined, `2+` elsewhere.


#### Non-primitive values

Non-primitive values are constructed from primitive values.

When decoding and for each of the following types, the first byte must be checked: if it equals `Byte.reference`, then the value should be treated as a reference.

- `Object`

  Write the values of the object one after the other, in the same order as defined in the schema.

  Size: `0+`

- `Array` and `Set`

  Write the length of the array as an `elastic signed integer`, then write all the array values, then the array's properties as an object.

  > Note: it is important to write the length as a signed integer instead of an unsigned even if an array length is always positive, so that there is no chance to mix a length byte with a `Byte.reference` character.

  Size: `0+`

- `Record` and `Map`

  Write the values of the map / record one after the other, in the same order as defined in the schema.

  Then write the record or map properties as an object.

  Size: `1+`


## Implementation advices

### String references

Checking if a string has already been referenced can impact badly the encoding speed.

You should compare pointers of strings instead of comparing content (not possible in every language), and if you have to compare contents, only compare small strings.

It also means two bunker files can have different sizes depending on the implementation.
