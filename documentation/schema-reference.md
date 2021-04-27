## Bunker schema reference

This page indexes all the types exported by Bunker to create your schemas.

### Table of contents
1. [**Primitive values**](#primitive-values)
   - [character](#character)
   - [boolean](#boolean)
   - [positiveInteger](#positiveinteger)
   - [integer](#integer)
   - [bigInteger](#biginteger)
   - [number](#number)
   - [string](#string)
   - [regularExpression](#regularexpression)
   - [date](#date)
   - [any](#any)
   - [binary](#binary)

2. [**Objects**](#objects)
   - [object](#object)
   - [array](#array)
   - [set](#set)
   - [map](#map)

3. [**Composed values**](#composed-values)
   - [nullable](#nullable)
   - [tuple](#tuple)
   - [instance](#instance)

4. [**Examples**](#examples)

###  Primitive values

#### character
A character is a one-byte value, ie. a number between `0` and `255`.

#### binary
A binary is an arbitrary list of bytes.

#### boolean
A boolean is a `true` or `false` value.

#### integer
An integer is encoded as an [elastic integer](https://github.com/digital-loukoum/bunker/tree/main/documentation/specifications.md#elastic-integers--).

#### positiveInteger
A positive integer is encoded as a [positive elastic integer](https://github.com/digital-loukoum/bunker/tree/main/documentation/specifications.md#elastic-integers--).

#### bigInteger
A bigInteger can be arbitrarily large. It is encoded as an [elastic integer](https://github.com/digital-loukoum/bunker/tree/main/documentation/specifications.md#elastic-integers--).

#### number
An number is a signed 64-bit float (a double) stored in [little-endian](https://en.wikipedia.org/wiki/Endianness) format.

#### string
A string is an UTF-8 list of characters with a trailing zero at the end.

#### regularExpression
A type to store regular expressions.

#### date

The number of milliseconds since 1970 stored as an [elastic integer](https://github.com/digital-loukoum/bunker/tree/main/documentation/specifications.md#elastic-integers--).

Can be negative for pre-1970 dates.

#### any
A any type can be any primitive, composed or object type.


### Objects

Objects are built from other types but are not objects: they are not stored in memory and so cannot be referenced.


#### object
An object contains a finite number of typed fields.
```ts
object({ [key: string]: Type }): Type
```

#### array
An array is an any-length list of a given type.

```ts
array(Type): Type
```

Since an array is also an object, it can have its own properties:
```ts
array(Type, { [key: string]: Type }): Type
```


#### set
A set is an any-length list of a given type.

Unlike an array, every element in a set is unique.

```ts
set(Type): Type
```

Since a set is also an object, it can have its own properties:
```ts
set(Type, { [key: string]: Type }): Type
```

#### map
A map is a list of typed `[key, value]` pairs.

```ts
map(KeyType, ValueType): Type
```

Since a map is also an object, it can have its own properties:
```ts
map(KeyType, ValueType, { [key: string]: Type }): Type
```

###  Composed values

Composed values are built from other types but are not objects: they are not stored in memory and so cannot be referenced.

#### nullable
A nullable is a value that can be `null` or `undefined`. In some languages it is called an optional.
```ts
nullable(type: Type): Type
```

#### tuple
A tuple is a finite list of types. A tuple is not considered an object and so is not memorized.
```ts
tuple(Type[]): Type
```

#### instance
An instance is a value constructed from a class.

```ts
instance(className: String): Type
```

The class has to be registered so that it can be retrieved by its name.


### Examples

You can view [here](https://github.com/digital-loukoum/bunker/tree/main/documentation/examples/ecmascript/schema.md) examples of schemas written in Javascript and using the official Bunker library.
