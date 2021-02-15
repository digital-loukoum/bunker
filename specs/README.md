# Bunker's binary format specifications

Bunker is a very efficient binary data format that can be used as a replacement for Json, Csv or MessagePack. Bunker format is great for every type of data but especially shines when handling big arrays of objects.

In average, Bunker data is 130% smaller than JSON and 100% smaller than MessagePack. If you use big arrays of objects, it can easly go up to 400% smaller than JSON. Bunker is the perfect alternative between space efficiency (zipped data will always be better) and encoding / decoding speed (zipped data will always be very very much slower).

Furthermore, Bunker can also store and load - unlike Json and MessagePack :

- Big integers
- Regular expressions
- Dates
- Circular references (JSON will crash)
- Arrays with properties
- Maps
- Sets
- Maps and sets with properties

This document explains the format used by Bunker to achieve great performance in storing data.

## Notions

The following notions are necessary to understand the bunker specifications.

### Base structure

Bunker data is composed of two parts: the data schema and then the data itself. Storing the schema before writing the data is the key to Bunker's efficieny. Imagine you have this object in Json:

```json
[
  {
    "name": "name1",
    "company": "company1",
    "phone": "number1"
  },
  {
    "name": "name2",
    "company": "company2",
    "phone": "number2"
  },
  {
    "name": "name3",
    "company": "company3",
    "phone": "number3"
  },
  ...etc etc...
]
```

Then if we would write this same data using Bunker in a Json-way, it would be something like:

```json
{
  "schema": {
    "type": "Array",
    "arrayOf": {
      "name": "String",
      "company": "String",
      "phone": "String",
    }
  },
  "data": [
    ["name1", "company1", "number1"],
    ["name2", "company2", "number2"],
    ["name3", "company3", "number3"],
    ...etc etc...
  ]
}
```

We can easily understand why the longer and the longer the array becomes, the better Bunker will compare to Json (or MessagePack). The keys "name", "company" and "phone" are not be repeated over and over (only once in the schema), which leads to a huge size improvement.

It's the same way as Csv or Sql works - except Csv can only handle arrays of objects, while Bunker can handle any type of data. 


### Base enumerations

The specification is based on two enumerations:

- The `Type` enumeration is used to write and read the schema.
  ```ts
  enum Type {
    // primitive types
    unknown = 0,
    any,
    boolean,
    character,
    integer,
    positiveInteger,
    bigInteger,
    number,
    string,
    regularExpression,
    date,
    reference,
    // non-primitive types
    nullable,
    object,
    array,
    set,
    tuple,
    record,
    map,
  }
  ```

- The `NullableValue` enumeration indicates if a nullable value is null, undefined, or well-defined.
  ```ts
  enum NullableValue {
    null = 0,
    undefined = 1,
    defined = 2,
  }
  ```

  > Note: depending on the language, if the `undefined` value does not exist it can be treated as a `null`.

- The constant `Byte` object stores special byte values.
  ```ts
  const Byte = {
    reference = 0xF8,  // used to indicate if the value is a reference to another value
    stop = 0xFF,  // used to indicate the end of an object definition in a schema
  }
  ```

### Integers

Bunker use a special format for integer which is named *elastic integers*. In low-level languages like C, the size of an integer is static: every `short int` is 2-bytes long, `long int` 4-bytes long, and `long long int` 8-bytes long.

Integers in Bunker use *as few space as possible* and can be infinitely big, using a very simple rule:

- if the first bit of the current byte is `1`, then the next byte continue to describe the number,
- if the first bit of the current byte is `0`, then this is the last byte.

These two rules have a single exception:

- in case of signed integer, the first bit of the first byte is used to set the sign, and then the second bit of the first byte is used to indicate the continuation of the integer.

Examples of `positive integers`:

`0` -> `00000000`
`1` -> `00000001`
...
`127` -> `01111111`
`128` -> `10000001 00000000`
`129` -> `10000001 00000001`

Examples of `signed integers`:

`-1` -> `10000001`
`-0` -> `10000000`
`1` -> `00000001`
...
`63` -> `00111111`
`64` -> `01000001 00000000`
`-64` -> `11000001 00000000`
`-65` -> `11000001 00000001`

### Floating numbers

Any number `n` can be written in the form: `n = b * 10 ^ i`, where `b` and `i` are signed integers, and `b` being as small as possible.

In Bunker, a floating number is simply `i` and then `b`, written as *signed elastic integers*.

Examples:

`0` -> `0e0` -> `00000000 00000000`
`-0` -> `-0e0` -> `00000000 10000000`
`1` -> `1e0` ->`00000000 00000001`
`9` -> `9e0` ->`00000000 00001001`
`10` -> `1e1` ->`00000001 00000001`
`11` -> `11e0` ->`00000000 00001011`
`0.1` -> `1e-1` ->`10000001 00000001`
`-0.1` -> `-1e-1` ->`10000001 10000001`

### Strings

Bunker strings:

- are encoded in UTF-8,
- finish with a trailing zero.

Examples:

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

- `Reference`

  Any non-primitive value or string can be a reference to a previously encountered non-primitive value or string.

  > Note: empty strings should not be referenced.

  Write `Byte.reference`, then the index of the object or the string in its corresponding array.

  Size: `2+`

#### Non-primitive values

Non-primitive values are constructed from primitive values.

When decoding and for each of the following types, the first byte must be checked: if it equals `Byte.reference`, then the value should be treated as a reference.

- `Nullable`

  First write:

  - `NullableValue.null` is the value is null,
  - or `NullableValue.undefined` is the value is undefined,
  - or `NullableValue.defined` is the value is defined,

  and then if the value is defined, write the value.

  Size: `1` if null or undefined, `2+` elsewhere.

- `Object`

  Write the values of the object one after the other, in the same order as defined in the schema.

  Size: `0+`

- `Array` and `Set`

  Write the length of the array as an `elastic signed integer`, then write all the array values, then the array's properties as an object.

  > Note: it is important to write the length as a signed integer instead of an unsigned even if an array length is always positive, so that there is no chance to mix a length byte with a `Byte.reference` character.

  Size: `0+`

- `Tuple`

  Write the values of the tuple one after the other, in the same order as defined in the schema.

  Size: `0+`

- `Record` and `Map`

  Write the values of the map / record one after the other, in the same order as defined in the schema.

  Then write the record or map properties as an object.

  Size: `1+`


## Implementation notes

### References

Let `o` be a random object. There can be two types of references:

- circular references: `o.self = o`,
- regular references: `[o, o]`.

There is no choice but to use a reference when encountering a circular reference - otherwise you would create an infinite loop - but when dealing with regular references you can freely choose to repeat the data instead of inserting a reference.

### String references

Checking if a string has already been referenced can impact badly the encoding speed.

You should compare pointers of strings instead of comparing content (not possible in every language), and if you have to compare contents, only compare small strings.
