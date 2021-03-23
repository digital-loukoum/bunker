# Bunker
Bunker is a fast and compact JSON alternative to store, pass and retrieve data.

It is comparable to [MessagePack](https://msgpack.org/index.html), but more efficient in terms of compacity.

Bunker is especially effeicient when working with arrays of objects. Instead of writing repeatedly all objects with all keys like JSON and MessagePack do, it guesses the most accurate schema and write keys and type *only once*. It results in very compact data size.

Some use cases for bunker :

- Replacing JSON when storing files,
- Replacing CSV when storing files (CSV also use a schema to avoid repetition but it's not as flexible as bunker - bunker can deal with any types),
- Creating your homemade database,
- Saving your files server-side and passing it to your client without compression (bunker format is already compact enough) for maximum speed efficiency,

Depending on existing Bunker implementations, it can also be great to communicate between processes written in different languages.

## Highlights

Unlike JSON and MessagePack, Bunker correctly encode and decode :
- Big integers
- Regular expressions
- Dates
- Circular references
- Arrays with properties
- Maps
- Sets
- Maps and sets with properties

## Data size comparison

Here are the results from comparing the Bunker output with regular JSON, MesssagePack and zipped JSON :

![](https://i.ibb.co/j4z9VMp/Capture-d-e-cran-2021-02-01-a-12-01-01.png)

In average, Bunker is about :
- 50% smaller than JSON.
- 30% smaller than MessagePack.
- 25% bigger than compressed JSON.

We can also note that Bunker is especially efficient with regular data - ie arrays of similar objects.

Zipped JSON is the best way to compress data but it also comes with very slow encoding / decoding. For example, this Bunker implementation is 3000% faster to decode data. See [benchmarks](#benchmarks).

## Usage

Bunker exports two functions to encode and decode data :

```ts
import { bunker, debunker } from 'bunker'

// signatures
function bunker(value: any, schema?: Schema): Uint8Array  // equivalent of JSON.stringify
function debunker(data: Uint8Array): any  // equivalent of JSON.parse
```

You can bunker any value. If you store the resulting data in a file, it should have the `.bunker` extension.

`bunker` and `debunker` can be used in a browser or Node environment.

### Basic example

```ts
import { bunker, debunker } from 'bunker'

const myObject = {
  foo: 12,
  bar: {
    hello: "Hello",
    you: "world"
  }
}

const bunkered = bunker(myObject)
const myObject2 = debunker(bunkered)
console.log(myObject2.foo)  // print "12"
```


### Saving and loading from a file in a Node environment

I you need to store data into a file using Node, two helper functions are exported :

```ts
import { bunkerFile, debunkerFile } from 'bunker/node'

// signatures
async function bunkerFile(file: string, value: any, schema?: Schema): void
async function debunkerFile(file: string): void
```


### Custom schema

When you bunker data, the first step is to guess the schema object.

This step is quite complicated to get the most accurate result, and so the heaviest part of encoding with Bunker is actually to guess the right schema. Giving the schema to the bunker function will lead to a huge performance boost (more than 300% faster for this bunker implementation).

If speed is a matter to you and if you need to `bunker(...)` a lot of data, it is recommanded to pass the schema manually.

#### Basic schema example

```ts
import { createSchema, Integer } from 'bunker'

const schema = createSchema({
  foo: Integer,
  bar: {
    hello: String,
    world: String,
  }
})

bunker({
  foo: 12,
  bar: {
    hello: "Hello ",
    world: "world",
  }
}, schema)
```

The `createSchema` function will make your schema Bunker-compatible.

Be cautious though, a bad schema will cause your data to be corrupted!

#### Full schema example

```ts
import { createSchema, Integer, PositiveInteger, Any, Nullable, ArrayOf, SetOf, MapOf } from 'bunker'

const schema = createSchema({
  integer: Integer,
  unsignedInteger: PositiveInteger,
  string: String,
  float: Number,
  boolean: Boolean,
  date: Date,
  regularExpression: RegExp,
  bigInteger: BigInt,
  any: Any,

  // a nullable can have the values 'null' and 'undefined'
  nullable: Nullable(Integer),

  tuple: [Integer, String],

  object: {
    nestedInteger: Integer,
    nestedString: String,
  },

  // a record is a dictionary with strings for keys
  // and all values sharing the same type
  // it's like a Map, but in object form
  record: RecordOf(Integer),

  array: ArrayOf(String),
  arrayOfObjects: ArrayOf({
    foo: String,
    bar: String,
  }),
  arrayWithProperties: ArrayOf(String, {
    size: PositiveInteger,
    isParsed: Boolean,
  }),

  set: SetOf(String),

  map: MapOf({ firstname: String, lastname: String }),
})
```


### Fetching bunker binary data from browser

Using the fetch API :

```ts
import { debunker } from 'bunker'
const response = await fetch('https://my-url/my-data.bunker')
const data = debunker(await reponse.arrayBuffer())
```


Using axios :

```ts
import { debunker } from 'bunker'
const response = await axios.get('https://my-url/my-data.bunker', { responseType: 'arraybuffer' })
const data = debunker(response.data)
```


### Serving bunker binary data from a node server

From a file :

```ts
import fs from 'fs'
import http from 'http'
import { bunker } from 'bunker'

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

From a variable :

```ts
import http from 'http'
import { bunker } from 'bunker'

http.createServer((request, response) => {
  const bunkered = bunker(12)

    response.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': bunkered.length,
    })

    response.end(bunkered)
})
```


## <a name="benchmarks"></a>Benchmarks
