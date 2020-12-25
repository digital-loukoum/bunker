# Bunker
A fast and compact JSON alternative to store, pass and retrieve data through a given schema.

You can think of Bunker as **binary csv**.

# Higlights

- Efficient size. Bunker stores data as binary and 
- Secure. Bunkered data cannot be debunkered with a different schema.
- Optimized to save and load from a file.



# Saving and loading from a file

Bunker can be used etiher in functional or object-oriented way.

## Functional use

```ts
import { bunker, debunker } from 'bunker'

const myObject = {
  foo: 12,
  bar: {
    hello: "Hello",
    you: "world"
  }
}

// write to the file myObject.bunker
await bunker(myObject, "./myObject.bunker")

// create a copy of myObject
const myObject2 = await debunker("./myObject.bunker")
console.log(myObject2.foo)  // print "12"
```

## Object-oriented use

Bunker default export is a mixin that you can use 

```ts
import { Bunkerable } from 'bunker'

class MyClass extends Bunkerable() {
  foo = 12
  bar = {
    hello: "Hello",
    you: "world"
  }
}

const myObject = new MyClass

// Bunker will guess the schema from the default values of the object
await myObject.bunker("./myObject.bunker")
myObject.foo = 24

await foo.debunker("./myObject.bunker")
console.log(myObject.foo)  // print "12"
```

### Inheriting from another class

Because Bunkerable is a mixin, you can still inherit from a parent class :

```ts
import { Bunkerable } from 'bunker'
import ParentClass from './ParentClass'

class MyClass extends Bunkerable(ParentClass) {
  ...
}
```


### Custom schema

Instead of letting Bunker guess the schema from the default values, you can pass your own schema :

```ts
import { Bunkerable, Integer } from 'bunker'

const schema = {
  foo: Integer,
  bar: {
    hello: String,
    world: String,
  }
}

class MyClass extends Bunkerable().withSchema(schema) {
  ...
}
```




# Fetching bunker binary data

Using the fetch API :

```ts
import { debunker } from 'bunker'
const response = await fetch('https://my-url/my-data.bunker')
const data = await debunker(await reponse.arrayBuffer())
```


Using axios :

```ts
import { debunker } from 'bunker'
const response = await axios.get('https://my-url/my-data.bunker', { responseType: 'arraybuffer' })
const data = await debunker(response.data)
```


# Sending bunker binary data from a node server

```ts
import { bunker } from 'bunker'


```


# Saving and loading from local storage
