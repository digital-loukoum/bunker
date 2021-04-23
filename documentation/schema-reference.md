## Bunker schema reference

This page indexes all the types exported by Bunker to create your schemas.

### Table of contents
1. [**Primitive values**](#primitive-values)
   - [character](#character)
   - [boolean](#boolean)
   - [positiveInteger](#positiveinteger)
   - [integer](#integer)
   - [integer32](#integer32)
   - [integer64](#integer64)
   - [bigInteger](#biginteger)
   - [float32](#float32)
   - [float64](#float64)
   - [number](#number)
   - [string](#string)
   - [regularExpression](#regularexpression)
   - [date](#date)
   - [any](#any)
   - [binary](#binary)

2. [**Composed values**](#composed-values)
   - [nullable](#nullable)
   - [tuple](#tuple)

3. [**Objects**](#objects)
   - [object](#object)
   - [array](#array)
   - [set](#set)
   - [map](#map)

4. [**Instances**](#instances)

5. [**Examples**](#examples)

### <a name="primitive-values"></a> Primitive values

##### character
A character is a one-byte value, ie. a number between `0` and `255`.

##### boolean
A boolean is a `true` or `false` value.

##### positiveInteger
A positive integer is an [elastic integer](https://github.com/digital-loukoum/bunker/tree/main/documentation/specifications#elastic-integers) that is always positive.

##### integer
An integer is an [elastic integer](https://github.com/digital-loukoum/bunker/tree/main/documentation/specifications#elastic-integers) that can be negative.

This is the default integer format used by Bunker.

##### integer32
An integer32 is a signed 32-bit integer stored in [little-endian](https://en.wikipedia.org/wiki/Endianness) format.

##### integer64
An integer64 is a signed 64-bit integer stored in [little-endian](https://en.wikipedia.org/wiki/Endianness) format.

##### bigInteger
A bigInteger is a signed [elastic integer](https://github.com/digital-loukoum/bunker/tree/main/documentation/specifications#elastic-integers) that can be arbitrarily large.

##### float32
An float32 is a signed 32-bit float stored in [little-endian](https://en.wikipedia.org/wiki/Endianness) format.

##### float64
An float64 is a signed 64-bit float (a double) stored in [little-endian](https://en.wikipedia.org/wiki/Endianness) format.

This is the default number format used by Bunker.

It can be used instead of the **number** type when encoding / decoding speed is more important than data density.

##### number
A number is an [elastic number](https://github.com/digital-loukoum/bunker/tree/main/documentation/specifications#elastic-number).

It can be used instead of the **float64** type when data density is more important than encoding / decoding speed.

##### string
A string is an UTF-8 list of characters with a trailing zero at the end.

##### regularExpression
Use this type to store regular expressions.

##### date

The number of milliseconds since 1970 stored as an [elastic integer](https://github.com/digital-loukoum/bunker/tree/main/documentation/specifications#elastic-integers).

##### any
A any type can be any primitive, composed or object type.

##### binary
A binary is an arbitrary list of bytes.


### <a name="composed-values"></a> Composed values

Composed values are built from other types but are not objects: they are not stored in memory and so cannot be referenced.

##### nullable
A nullable is a value that can be `null` or `undefined`. In some languages it is called an optional.
```ts
nullable(type: Type): Type
```

##### tuple
A tuple is a finite list of types. A tuple is not considered an object and so is not memorized.
```ts
tuple(Type[]): Type
```


### Objects

Objects are built from other types but are not objects: they are not stored in memory and so cannot be referenced.


##### object
An object contains a finite number of typed fields.
```ts
object({ [key: string]: Type }): Type
```

##### array
An array is an any-length list of a given type.

```ts
array(Type): Type
```

Since an array is also an object, it can have its own properties:
```ts
array(Type, { [key: string]: Type }): Type
```


##### set
A set is an any-length list of a given type.

Unlike an array, every element in a set is unique.

```ts
set(Type): Type
```

Since a set is also an object, it can have its own properties:
```ts
set(Type, { [key: string]: Type }): Type
```

##### map
A map is a list of typed `<key, value>` pairs.

```ts
map(KeyType, ValueType): Type
```

Since a map is also an object, it can have its own properties:
```ts
map(ValueType, KeyType = String, { [key: string]: Type }): Type
```


### Instances
An instance is a value constructed from a class.

```ts
instance(className: String): Type
```

The class has to be registered so that it can be retrieved by its name.


### Examples

You can view [here](https://github.com/digital-loukoum/bunker/tree/main/documentation/examples/ecmascript/schema) examples of schemas written in Javascript and using the official Bunker library.
