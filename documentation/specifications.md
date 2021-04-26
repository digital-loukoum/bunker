## Bunker 3 binary format specifications

Bunker is a very efficient binary data format that can be used as a replacement for JSON, CSV, MessagePack or ProtocolBuffers that uses its own binary format to store data in a very compact and efficient way.

This document is the official specifications for the bunker 3 binary format.

All future versions of bunker will be compatible with this specification.

### Table of contents
1. [**Data structure**](#data-structure)

2. [**Enumerations**](#enumerations)
   - [Type](#enumeration-type)
   - [NullableValue](#enumeration-nullable-value)
   - [Byte](#enumeration-byte)

3. [**Elastic integers**](#elastic-integers)
   - [Positive elastic integers](#unsigned-elastic-integers)
   - [Signed elastic integers](#signed-elastic-integers)

4. [**Strings**](#string)

5. [**Encoding schema**](#encoding-schema)
   5.1. [Primitive values](#encoding-schema-primitives-values)

   5.2. [Composed values](#encoding-schema-composed-values)
   - [nullable](#encoding-schema-nullable)
	- [tuple](#encoding-schema-tuple)
	- [recall](#encoding-schema-recall)

   5.3. [Object values](#encoding-schema-object-values)
	- [object](#encoding-schema-object)
	- [array](#encoding-schema-array)
	- [set](#encoding-schema-set)
	- [map](#encoding-schema-map)
	- [instance](#encoding-schema-instance)

6. [**Encoding data**](#encoding-data)
   6.1. [*Primitive values*](#encoding-data-primitive-values)
	- [character](#encoding-data-character)
	- [binary](#encoding-data-binary)
	- [boolean](#encoding-data-boolean)
	- [positiveInteger](#encoding-data-positive-integer)
   - [integer](#encoding-data-integer)
	- [bigInteger](#encoding-data-big-integer)
	- [number](#encoding-data-number)
	- [string](#encoding-data-string)
	- [regularExpression](#encoding-data-regular-expression)
	- [date](#encoding-data-date)
	- [any](#encoding-data-any)

   6.2. [*Composed values*](#encoding-data-composed-values)
   - [nullable](#encoding-data-nullable)
   - [tuple](#encoding-data-tuple)

   6.3. [*Object values*](#encoding-data-object-values)
   - [object](#encoding-data-object)
   - [array](#encoding-data-array)
   - [set](#encoding-data-set)
   - [map](#encoding-data-map)
   - [instance](#encoding-data-instance)

7. [**Implementation tips**](#implementation-tips)
   - [String references](#string-references)

## Data structure <a href="#data-structure"></a>

Bunker data is composed of two parts:

- first the encoded `schema`,
- then the encoded `data`.

For example, if you run `bunker(3)` you will get the following data buffer: `[7, 3]`.

- `7` is the byte that indicates an integer (see the [Type](#enumeration-type) enumeration),
- `3` is the data value encoded as an [elastic integer](#elastic-integers).

The whole schema is encoded before the whole data part.

Encoding the schema along the data might seem unnecessary, but it brings safety: you can decode any data without having to know what schema was used when it is encoded.

## Enumerations <a href="#enumerations"></a>

The following enumerations will be used throughout the whole document in the form: `EnumerationName.key`.

### Type <a href="#enumeration-type"></a>
The `Type` enumeration is used to encode the `schema`.
```ts
enum Type {
   // primitives
   unknown = 0,
   character,
   binary,
   boolean,
   positiveInteger,
   integer,
   bigInteger,
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
}
```

- `Type.reference` indicates a previously encountered object,
- `Type.stringReference` indicates a previously encountered string.



### NullableValue <a href="#enumeration-nullable-value"></a>

The `NullableValue` enumeration is used by the nullable type to indicate whether a nullable value is null, undefined, or defined.
  ```ts
  enum NullableValue {
    null = 0,
    undefined = 1,
    defined = 2,
  }
  ```


### Byte <a href="#enumeration-byte"></a>

Miscellaneous byte values.

```ts
enum Byte {
   reference = 0xf8,
   stringReference = 0xf9,
   start = 0xfe,
   stop = 0xff,
}
```

## Elastic integers <a href="#elastic-integers"></a>

Bunker use custom binary formats to store integers:

- `unsigned elastic integers` to store unsigned integers,
- `signed elastic integers` to store signed integers.

They are called *elastic* because they use as few data space as possible and they can scale infinitely.

### Unsigned elastic integers <a href="#unsigned-elastic-integers"></a>

An unsigned elastic integer is similar to a regular integer, except that the first bit of each byte - instead describing the number value - is used as a "continuation bit":

- if the first bit of the current byte is `1`, then the next byte continue to describe the number,
- if the first bit of the current byte is `0`, then this byte is the last byte.

#### Example of algorithm

Let's encode the arbitrary positive integer `42345`:

1. write it in binary format: `1010010101101001`,
2. split it into chunks of seven bits: `0000010` `1001010` `1101001`
3. add `0` in front of the last chunk and `1` in front of the others: `10000010` `11001010` `01101001`.

=> `[10000010, 11001010, 01101001]` is the 3-bytes representation of `42345`.

#### Examples of unsigned elastic integer representations

`0` -> `00000000`
`1` -> `00000001`
...
`127` -> `01111111`
`128` -> `10000001 00000000`
`129` -> `10000001 00000001`


### Signed elastic integers <a href="#signed-elastic-integers"></a>

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


## Strings <a href="#strings"></a>

All bunker strings:

- are encoded in UTF-8,
- end with a trailing zero.

### Examples

`"a"` -> `[97, 0]`
`"à"` -> `[195, 160, 0]`
`"的"` -> `[231, 154, 132, 0]`
`"😋"` -> `[240, 159, 152, 139, 0]`


## Encoding schema  <a href="#encoding-schema"></a>

The first step when encoding with bunker is to encode the schema.

### Primitive values  <a href="#encoding-schema-primitive-values"></a>
`[Type.{primitive}]` is written as a byte, where `{primitive}` is one of the primitive types:
- `unknown`
- `character`
- `binary`
- `boolean`
- `positiveInteger`
- `integer`
- `bigInteger`
- `number`
- `string`
- `regularExpression`
- `date`
- `any`

### Composed values  <a href="#encoding-schema-composed-values"></a>

Composed values are constructed from primitive types but they are not object.

#### nullable(type)
A nullable is value is a value that can be `null` or `undefined`.

`Type.nullable` is written as a byte, then the schema of `type`.

Examples:

```ts
// nullable integer
[Type.nullable, Type.integer]
// nullable object with a 'foo' key with a string value
[Type.nullable, Type.object, "foo", Type.string, ByteIndicator.stop]
```


#### tuple(type1, type2, type3, ...)

`Type.tuple` is written as a byte, then the tuple length is written as a `positive integer`, then `type1` schema is written, then `type2` schema, etc...


#### recall(index)
A reference to a previously encountered object schema (arrays, maps and sets are considered objects).

> The recall type happens when bunker has to guess the type of a recursive object.

`index` is the position of the encountered schema in the array of all encountered schemas (object schemas only). **The index is relative to the current scope:** every encountered `any` type has its own scope with its own array of encountered object schemas.

`Type.recall` is written as a byte, then `index` as a `positive integer`.

> Bunker implementations that do not dynamically guess types don't have to bother with the recall schema when encoding. They still have to deal with it when decoding.

##### Examples
```ts
value: { self: data }
encoded schema: [Type.object, "self", Type.reference, 0, ByteIndicator.stop]
// we reference to 0 because the first encountered object is `data`
// if `data` was nested inside another object, its index would not be 0
```

```ts
value: {
   meta: {
      foo: "bar"
   },
   referenceToMeta: data.meta
}
encoded schema: [
   Type.object,
   "meta",
   Type.object,
   "foo",
   Type.string,
   ByteIndicator.stop,
   "referenceToMeta",
   Type.reference,
   1,
   ByteIndicator.stop
]
// we reference to 1 because data.meta is the second encountered object
// // (the first encountered object is 'data')
```


### Object values  <a href="#encoding-schema-object-values"></a>

#### object  <a href="#encoding-schema-object"></a>

Encode: `[Type.object, "first key", (first key value type), "second key", (second key value type), ..., Byte.stop]`

`Type.object` is written as a byte, then all the keys following by their value's schema, then a finishing `Byte.stop`.

Examples:

```ts
value: {}
encoded schema: [Type.object, ByteIndicator.stop]
```

```ts
value: { foo: "bar", x: 12 }
encoded schema: [
   Type.object,
   "foo",
   Type.string,
   "x",
   Type.number,
   ByteIndicator.stop
]
```


#### array(type, properties)

  `Type.array` is written as a byte, then `type` schema is written, then `properties` schema.

##### Examples

```ts
value: [1, 2, 3]
// the `ByteIndicator.stop` is indicating the array has no properties
encoded schema: [Type.array, Type.integer, ByteIndicator.stop]
```

```ts
// this is an array with properties
value: [1, 2, 3, length: 3, capacity: 12]
encoded schema: [
  Type.array,
  Type.integer,
  "length",
  Type.integer,
  "capacity",
  Type.integer,
  ByteIndicator.stop
]
```

#### set(type, properties)

`Type.set` is written as a byte, then `type` schema is written, then `properties` schema.

#### map(keyType, valueType, properties)

`Type.map` is written as a byte, then `keyType` schema is written, then `valueType` schema, then `properties` schema.

## Encoding data

After the schema comes the encoded data. You no longer encode the type of the data but its value.

### Primitive values

#### character

A character is a single byte value that goes from `0` to `255`.

Size: `1`

#### boolean

If true, write the character `1`, else write the character `0`.

Size: `1`

#### integer

Write the integer's value as an elastic signed integer.

Size: `1+`

#### positiveInteger

Write the integer's value as an elastic unsigned integer.

Size: `1+`

#### number

Write the number's value as a float64 number in little endian format.

Size: `8`

#### bigInteger

Write the big integer's value as an elastic signed integer.

Size: `1+`

#### string

- If the string has already been encountered:

   Write `Byte.stringReference` and the position of the string in the array of encountered strings as a `positive integer`.

- If the string has not been encountered:

   Write the string encoded in `utf-8` with a trailing zero at the end.

When decoding, check the first byte. If it is equal to `Byte.stringReference`, then you have a string reference. Otherwise you can read the string up to the trailing zero (first byte included).

> Since `Byte.stringReference` is a character that cannot happen in utf-8, there is no chance to mix a raw string with a string reference.

#### regularExpression

A regular expression consists of two parts:

- the `expression` itself,
- and its `flags` (`'g' | 'i' | 'm' | ...`)

Write the `expression` as a string, then the `flags` as a string.

Size: `2+`

#### date

Write the number of milliseconds since 1970 as an elastic signed integer.

A negative number means a date before 1970.

Since elastic integers can be as big as possible, any date can be encoded with a millisecond-precision.

Size: `1+`

### Composed values

#### tuple

Write the values of the tuple one after the other, in the same order as defined in the schema.

Size: `0+`

#### recall

#### nullable

First write:

- `NullableValue.null` is the value is null,
- or `NullableValue.undefined` is the value is undefined,
- or `NullableValue.defined` is the value is defined,

If the value is defined, then write the value.


### Object values
Every object value can be a reference to a previously encountered object.

This rule applies to all the following types:

- if the object to encode has already been encoutered, write `Byte.reference` then the index of the object in the array of all previously encountered objects,
- else, write the value of the object depending on its type, as indicated after.

#### object

Write `Type.object`, then the values of the object one after the other in the same order as their respective keys (previously encoded in the schema).

> The `Type.object` prefix byte guarantees there is no mix between a raw object and the reference of an object.

#### array

Write the length of the array as an `elastic signed integer`, then write all the array values, then the array's properties as a <u>raw object</u>.

> It is important to write the length as a <u>signed integer</u>. Since an array length is always positive the first bit will be `0` - so there is no chance to mix it with a `Byte.reference` byte.

A *raw object* is an encoded object without the `Type.object` prefix byte.

#### set

Write the length of the set as an `elastic signed integer`, then write all the set values, then the set's properties as a <u>raw object</u>.

A *raw object* is an encoded object without the `Type.object` prefix byte.

#### map

Write the number of entries as an `elastic signed integer`, then the first key of the map, then its associated value, then the second key, then its associate value, etc...

Then write the map properties as a <u>raw object</u>.

A *raw object* is an encoded object without the `Type.object` prefix byte.

## Implementation advices

### String references

Checking if a string has already been referenced can impact badly the encoding speed.

You should compare pointers of strings instead of comparing content (not possible in every language), and if you have to compare contents, only compare small strings.

It also means two bunker files can have different sizes depending on the implementation.



## Memory and references

References is one of the key features of Bunker. It enables you to handle circular references and it greatly helps to reduce the data size.

It is also the most complex feature to implement.

Usually when you need to deal with references, you would create a dictionary which contains all your referenced objects / strings, and when you need to access the object you point to it with its index.

This approach would force you to use a dictionary on one hand, the data on the other, and finally merge the two. This is suboptimal because then you would need to copy-paste all the data in memory when the encoding is done.

Bunker does not use a separate dictionary. Instead, every time an object to memorized is encountered, it is stored in an array and we can reference it later by using its index.

There are two types of memory:

- schema memory,
- data memory.

### Schema memory

We need memory for schema when guessing the type of an object with a circular reference.

> Bunker implementations that do not have the capacity to dynamically guess a type from a value dont have to deal with schema memory when encoding.

Imagine this use case:

```ts
import { bunker, any } from "@digitak/bunker";

const objectWithCircularReference = {};
objectWithCircularReference.self = objectWithCircularReference;

bunker(objectWithCircularReference, any);
```

Since bunker does not know the type of `objectWithCircularReference`, it will try to guess it. And it will guess the following schema:

```ts
object({
   self: recall(0)
})
```

But what does `recall(0)` mean? This is what happens:

- when starting to guess the value, we first encounter the `objectWithCircularReference` object,
- since it is an object we memorize it,
- when guessing the type of property `self` we realize we are encountering an already encountered object. So instead of trying infinitely to guess its type, we say "it's the same type as the first object we encountered (ie at index 0 in memory)".


 Concretely:

- when you encode data, it means every time you encounter an object, you push it to your refererences' array, and in case you encounter the object again, you write its index as reference instead of writing again the object;
- and when you decode data, every time you encounter an object you push it to your references array, and when you encounter a reference, you retrieve the right object from this array.


Three arrays are needed: one for object references in schema, one for object references in encoded data, and one for string references in encoded data. The indexes don't mix between those three arrays.
