# Bunker
Bunker is a fast and compact JSON alternative to store and share data in a binary format with a friendly API.

It can be compared to [MessagePack](https://msgpack.org/index.html) or [Protocol Buffers](https://developers.google.com/protocol-buffers).

Bunker is finely optimized to be very compact. In average, its output is **2.5x smaller than JSON** and **2x smaller than MessagePack**. See the [data size comparison](#output-size) appendice for more details.

Bunker achieves this extreme density by:

- using a **custom binary format for integers** called  [elastic integers](https://github.com/digital-loukoum/bunker/tree/main/documentation/specifications.md#elastic-integers),
- working well with **arrays of objects**. Instead of writing repeatedly all objects with all keys like JSON and MessagePack do, it guesses the most accurate schema and write keys and types only once,
- **memorizing** and **reusing strings and objects** so that nothing is encoded twice.

Bunker is very compact but also extremely versatile as it can encode any data type.

Unlike JSON and MessagePack, Bunker correctly encode and decode:

- big integers,
- regular expressions,
- dates,
- **arrays with properties**,
- maps,
- sets,
- maps and sets with properties,
- **instances of classes** (you can store and retrieve your prototypes),
- and **circular references**.

This library is written in **Typescript** so you don't need to import types. It is compatible with Node, Deno and a browser environment (except for `bunkerFile` and `debunkerFile` that are only compatibles with Node).

## Use cases

Bunker is great to:

- store data,
- share data between processes.

For example you can use Bunker to communicate between a server and a client with more efficiency and versatility than JSON.

You can also save your objects into bunker files and load them later on.

Or you can use Bunker to communicate between a process written in language X and another one written in language Y.

If you don't find a bunker library written in your favorite programming language, feel free to create your own by following the [official bunker binary format specifications](https://github.com/digital-loukoum/bunker/tree/main/documentation/specifications.md).


## API

Bunker exports two main functions to encode and decode data:

- `bunker` is the equivalent of `JSON.stringify`,
- `debunker` is the equivalent of `JSON.parse`.

```ts
function bunker(value: any, schema?: Schema): Uint8Array
function debunker(data: Uint8Array): unknown
```

You can encode and decode any value except functions.

> If you store the resulting data in a file, it should have the `.bunker` extension.

`bunker` and `debunker` can be used in a browser, Node or Deno environment.

#### Basic example

```ts
import { bunker, debunker } from '@digitak/bunker'

const myObject = {
   foo: 12,
   bar: {
      hello: "Hello",
      you: "world"
   }
}

const encoded = bunker(myObject)
const decoded = debunker(encoded)
console.log(decoded.foo)  // print "12"
```


### Reading and writing files with bunker

Bunker also exports two functions to easily encode to a file / decode from a file:

```ts
async function bunkerFile(file: string, value: any, schema?: Schema): void
async function debunkerFile(file: string): unknown
```

These two functions scale well: you can load huge files without affecting your memory.

#### Basic example

```ts
import { bunkerFile, debunkerFile } from '@digitak/bunker/io'

const myObject = {
   foo: 12,
   bar: {
      hello: "Hello",
      you: "world"
   }
}

bunkerFile('./myFile.bunker', myObject)
const decoded = debunkerFile('myFile.bunker')

console.log(decoded.foo)  // print "12"
```



### Using a schema

When you encode data with bunker, the first step is to guess the schema of the object.

Guessing the most precise schema is the heaviest part of encoding data with Bunker. Manually indicating Bunker what schema to use will drastically improve encoding and decoding speed!

You can use a schema in two ways:

- on the fly by passing the schema to the `bunker` function,
- or you can compile it to get an encoder and a decoder function.

For the exhaustive list of schema types exported by Bunker you can read the [complete schema reference](https://github.com/digital-loukoum/bunker/tree/main/documentation/schema-reference.md).

You can also browse [examples of schemas written in Javascript](https://github.com/digital-loukoum/bunker/tree/main/documentation/examples/ecmascript/schema.md).

#### On the fly schema

You pass the schema as a second argument to the `bunker` function.

##### Basic example

```ts
import { bunker, integer, string } from '@digitak/bunker'

const encoded12 = bunker(12, integer)
const encodedHelloWorld = bunker("Hello world!", string)
const encodedObject = bunker({
   id: 42,
   name: "Foo",
}, object({
   id: integer,
   name: string,
}))

console.log(debunker(encoded12)) // print 12
console.log(debunker(encodedHelloWorld)) // print "Hello world!"
console.log(debunker(encodedObject)) // print { id: 42, name: "Foo" }
```

The `debunker` function does not need to know the schema since it is encoded along with its value.

> Be cautious, a bad schema for a given value may cause unpredictable bugs!

#### Schema compilation


##### Basic example
```ts
import { bunker, number } from '@digitak/bunker'

const { encode, decode } = bunker.compile(number)

const encoded12 = encode(12)
const encoded36 = encode(36)

console.log(decode(encoded12)) // print 12
console.log(decode(encoded36)) // print 36
```

Note that you could use `debunker` instead of the compiled `decode` function, but `decode` is slightly faster since it already knows the schema of the value to decode.


### Naked encoding

When you don't want to encode the schema informations and only get the data you can use **naked encoding**:

```ts
import { bunker, number } from '@digitak/bunker'

const { encodeNaked, decodeNaked } = bunker.compile(number)

const encoded12 = encodeNaked(12)
const encoded36 = encodeNaked(36)

console.log(decodeNaked(encoded12)) // print 12
console.log(decodeNaked(encoded36)) // print 36
```

Naked encoding slightly improves data density as well as encoding / decoding speed, but you take the risk of ***losing your data*** if you lose the schema you used.

### Encoding and decoding instances

In order to encode and decode an instance, its class has to be registered.

To register a class, use the `register` function with the following arguments:

- a **constructor function** (used to decode instances),
- the **schema** of the class (used to encode and decode instances),
- and optionally a **name** if it differs from the constructor's name.

```ts
import { register } from '@digitak/bunker'

register(
   constructor: InstanceConstructor,
   schema: Schema,
   name?: string
): void
```

#### Example

Let's say we have this simple `Foo` class:
```ts
class Foo {
   constructor(public name: string) {}

   sayHello() {
      console.log(`Hello, I'm ${this.name}!`)
   }
}
```

First we register it so that we can encode and decode it with bunker:
```ts
import { register, object, string } from '@digitak/bunker'

register(Foo, object({ name: string }))
```

Then we can encode and decode as many instances of `Foo` as we like:

```ts
import { bunker, debunker } from '@digitak/bunker'

const bar = new Foo("Bar")
const encodedBar = bunker(bar)
const decodedBar = debunker(encodedBar)

decodedBar.sayHello() // will print "Hello, I'm Bar!"
```

Here bunker automatically guessed that `bar` is an instance of `Foo`, but we can also indicate manually what the type of `bar` is:

```ts
import { bunker, instance } from '@digitak/bunker'

const encodedBar = bunker(bar, instance("Foo"))
```


### How to fetch bunker binary data from browser

Using the fetch API:

```ts
import { debunker } from '@digitak/bunker'

const response = await fetch('https://my-url/my-data.bunker')
const data = debunker(await reponse.arrayBuffer())
```


Using axios:

```ts
import { debunker } from '@digitak/bunker'

const response = await axios.get('https://my-url/my-data.bunker', {
   responseType: 'arraybuffer'
})
const data = debunker(response.data)
```


### How to serve bunker binary data from a node server

If you serve a file, it is recommended to use streams:

```ts
import fs from 'fs'
import http from 'http'
import { bunker } from '@digitak/bunker'

http.createServer((request, response) => {
   const filePath = 'myfile.bunker'
   const stat = fs.statSync(filePath)

   response.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      'Content-Length': stat.size,
   })

   const readStream = fs.createReadStream(filePath)
   readStream.pipe(response)
})

```

Or you can serve from any value:

```ts
import http from 'http'
import { bunker } from '@digitak/bunker'

http.createServer((request, response) => {
   const encoded = bunker(12)

   response.writeHead(200, {
     'Content-Type': 'application/octet-stream',
     'Content-Length': encoded.length,
   })

   response.end(encoded)
})
```



## Comparisons

### Output size

Here is the comparison between JSON, Bunker (with and without schema) and MessagePack using a variety of object patterns frequently used:

![Data size comparison](https://raw.githubusercontent.com/digital-loukoum/bunker/main/assets/bunker-data-size-comparisons.png)

Naked bunker (ie. without the schema encoded, only data) is obviously the winner in all categories, but embedding the schema is not as costy as we may think, especially for large objects.

In average, Bunker's encoded data is:

- **2.5x smaller** than JSON (**2.75x** smaller for naked encoding),
- **2.1x smaller** than MessagePack (**2.35x** smaller for naked encoding).

For small and non-repetitive objects Bunker will not improve size drastically, but for huge and repetitive objects (like `big-regular`), it can be up to **5x smaller** than JSON.

### Encoding / decoding speed

If you manually indicates the schema of your values, this Typescript implementation of the bunker binary format specification is extremely fast.

Letting Bunker guessing the schema of your values will badly affect your performances, especially when encoding. But you should worry about performances only if you encode / decode a lot of data because it's still going to be quite fast.

On the other hand, the bunker type guesser will do an awesome job at guessing very precisely the type of any value.
