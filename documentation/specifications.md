## Bunker 3 binary format specifications

Bunker is a very efficient binary data format that can be used as a replacement for JSON, CSV, MessagePack or ProtocolBuffers that uses its own binary format to store or share data in a very compact and efficient way.

This document is the official specifications for the **bunker 3 binary format**.

### Table of contents
1. [Data structure](#data-structure)

2. [Enumerations](#enumerations)
   - [Type](#type)
   - [NullableValue](#nullablevalue)
   - [Byte](#byte)

3. [Elastic integers](#elastic-integers)
   - [Unsigned elastic integers](#unsigned-elastic-integers)
   - [Signed elastic integers](#signed-elastic-integers)

4. [Strings](#strings)

5. [Encoding schema](#encoding-schema)

6. [Encoding data](#encoding-data)

7. [Implementation tips](#implementation-tips)
   - [String references](#string-references)
   - [Object references](#object-references)
      - [Schema memory](#schema-memory)
      - [Data memory](#data-memory)

## Data structure

Bunker data is composed of two parts:

- first the encoded `schema`,
- then the encoded `data`.

For example, if you run `bunker(3)` you will get the following data buffer: `[7, 3]`.

- `7` is the byte that indicates an integer (see the [Type](#enumeration-type) enumeration),
- `3` is the data value encoded as an [elastic integer](#elastic-integers).

The whole schema is encoded before the whole data part.

Encoding the schema along the data might seem unnecessary, but it brings safety: you can decode any data without having to know what schema was used when it is encoded.

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
   instance,
   recall,

   // objects
   object,
   array,
   set,
   map,
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
   reference = 0xf8,
   stringReference = 0xf9,
   start = 0xfe,
   stop = 0xff,
}
```

## Elastic integers

Bunker use custom binary formats to store integers:

- `unsigned elastic integers` to store unsigned integers,
- `signed elastic integers` to store signed integers.

They are called *elastic* because they use as few data space as possible and they can scale infinitely.

### Unsigned elastic integers

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


### Signed elastic integers

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


## Strings

All bunker strings:

- are encoded in `utf-8`,
- end with a trailing zero byte.

Strings **lengthier than 1 character** are memorized and can be retrieved later as string references.

During encoding, if the string has already been encountered:

   - write `Byte.stringReference`,
   - and write the position of the string in the array of encountered strings as a `positive integer`.

If the string has not been encountered:

   - write the string encoded in `utf-8`,
   - write a trailing `0` byte at the end.

When decoding, check the first byte. If it is equal to `Byte.stringReference`, then you have a string reference. Otherwise you can read the string up to the trailing zero (first byte included).

The schema and the data share the same string memory: if a string is used in schema and encountered again in data, it's going to be a string reference.

> Since `Byte.stringReference` is a special byte that cannot happen in utf-8, there is no chance to mix a raw string with a string reference.

#### Raw string examples
`"a"` -> `[97, 0]`
`"à"` -> `[195, 160, 0]`
`"的"` -> `[231, 154, 132, 0]`
`"😋"` -> `[240, 159, 152, 139, 0]`


## Encoding schema  

The first step when encoding with bunker is to encode the schema.

### Primitive values  
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


### Object values  

#### object  

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

### Composed values  

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


#### instance(name)  

An instance is a value instantiated from a class.

`Type.instance` is written as a byte, then its class `name` as a string.

Then, if it's the first time this type of instance is encountered, the class schema is written. (Most of the time the class schema will be an object, but it can also be a class that inherits a map or an array for example).

Subsequent encounters of instances with the same name must not rewrite the class schema.

##### Examples
Using the following class `Foo`:
```ts
class Foo {
   id: number

   constructor(id: number) {
      this.id = id
   }

   getId() {
      return this.id
   }
}
```

```ts
value: new Foo(12)
encoded schema: [
   Type.instance,
   "Foo",
   // since its the first time a Foo instance is encountered, we add the
   // schema of Foo - which is an object with a value 'id' of type 'integer':
   Type.object,
   "id",
   Type.integer,
   Byte.stop,
]
```

Example of multiple instances of the same class:
```ts
value: {
   foo1: new Foo(1),
   foo2: new Foo(2),
}
encoded schema: [
   Type.object,

   // the 'foo1' key with its type
   "foo1",
   Type.instance,
   "Foo",
   // since its the first time a Foo instance is encountered, we add the
   // schema of Foo - which is an object with a value 'id' of type 'integer':
   Type.object,
   "id",
   Type.integer,
   Byte.stop,

   // the 'foo2' key with its type
   "foo2",
   Type.instance,
   "Foo",
   // since Foo's schema has already been described earlier we don't do it again

   Byte.stop,
]
```


#### recall(index)  
A reference to a previously encountered object schema (arrays, maps and sets are considered objects).

> The recall type happens when bunker has to guess the type of a recursive object.

`index` is the position of the encountered schema in the array of all encountered schemas (object schemas only). **The index is relative to the current scope:** every encountered `any` type has its own scope with its own array of encountered object schemas.

`Type.recall` is written as a byte, then `index` as a `positive integer`.

> Bunker implementations that do not dynamically guess types don't have to bother with the recall schema when encoding. They still have to deal with it when decoding.

You can read more in the [implementation tips](#implementation-tips) section dedicated to [schema memory](#schema-memory).

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
// (the first encountered object is 'data')
```



## Encoding data  

After the schema comes the encoded data. You no longer encode the type of the data but its value.

### Primitive values  

#### character  

A character is a single byte value that goes from `0` to `255`.

Size: `1` byte

#### boolean  

If true, write the character `1`, else write the character `0`.

Size: `1` byte

#### integer  

Write the integer's value as an elastic signed integer.

Size: `1+` byte(s)

#### positiveInteger  

Write the integer's value as an elastic unsigned integer.

Size: `1+` byte(s)

#### number  

Write the number's value as a float64 number in little endian format.

Size: `8` bytes

#### bigInteger  

Write the big integer's value as an elastic signed integer.

Size: `1+` byte(s)

#### string  

Write the string value as specified in the [strings](#strings) section.

Size: `1+` byte(s)

#### regularExpression  

A regular expression consists of two parts:

- the `expression` itself,
- and its `flags` (ex: `'g'` `'gi'`,  `'m'` , ...)

Write the `expression` as a string, then the `flags` as a string.

Size: `2+` bytes

#### date  

Write the number of milliseconds since 1970 as an elastic signed integer.

A negative number means a date before 1970.

Since elastic integers can be as big as possible, any date can be encoded with a millisecond-precision.

Size: `1+` byte(s)

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


### Composed values  

#### tuple  

Write the values of the tuple one after the other, in the same order as defined in the schema.

#### nullable  

First write:

- `NullableValue.null` is the value is null,
- or `NullableValue.undefined` is the value is undefined,
- or `NullableValue.defined` is the value is defined,

If the value is defined, then write the value.

#### instance  

Write the instance value depending on the schema of its class (an object most of the time, but it can also be instances of classes that inherited maps or arrays).




## Implementation tips  

### String references  

The string memory is common between schema and data.

Every time a string lengthier than 1 character is encountered, it is memorized.

Checking if a string has already been referenced can impact badly the encoding speed.

You should compare pointers of strings instead of comparing content (not possible in every language), and if you have to compare contents, only compare small strings.

It also means two bunker files can have different sizes depending on the implementation.


### Object references  

References is one of the key features of Bunker. It enables you to handle circular references and it greatly helps to reduce the data size.

It is also the most complex feature to implement.

Usually when you need to deal with references, you would create a dictionary which contains all your referenced objects / strings, and when you need to access the object you point to it with its index.

This approach would force you to use a dictionary on one hand, the data on the other, and finally merge the two. This is suboptimal because then you would need to copy-paste all the data in memory when the encoding is done.

Bunker does not use a separate dictionary. Instead, every time an object to memorized is encountered, it is stored in an array and we can reference it later by using its index.

There are two types of object memory:

- schema memory,
- data memory.

#### Schema memory  

We need schema memory to deal with the [recall](#encoding-schema-recall) type, which happens when dynamically guessing a schema and finding out the same object multiple times.

> Bunker implementations that do not dynamically guess a type from a value dont have to deal with schema memory when encoding. They still must deal with it when decoding though.

Imagine this use case:

```ts
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
- when guessing the type of property `self` we realize we are encountering an already encountered object. So instead of trying infinitely to guess its type, we say: **it's the same type as this object we already encountered and memorized at index `0`**.

The memory index **is relative to the current scope**. There are two kinds of scopes:

- the global scope,
- one scope for each `any` type encountered.

Values of type `any` have their schema encoded within the data just before their value. This "inline schema" use its own schema memory. This is done so that you can guess a schema separately from an Encoder.

#### Data memory  

Data memory is simpler to handle than schema memory because there is only one global scope.

To sum it up:

- when you encode data, every time you encounter an object you push it to your array of objects, and in case you encounter the object again, you write its index as reference instead of writing again the object,
- when you decode data, every time you encounter an object you push it to your references array, and when you encounter a reference, you retrieve the right object from this array.
