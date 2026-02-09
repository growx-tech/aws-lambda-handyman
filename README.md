<p align="center">
  <h1 align="center">AWS Lambda Handyman</h1>
  <p align="center">
    AWS Lambda TypeScript validation made easy 🏄 ...️and some other things
  </p>
</p>

```typescript
class BodyType {
  @IsEmail()
  email: string
}

class SpamBot {
  @Handler()
  static async handle(@Body() { email }: BodyType) {
    await sendSpam(email) // ->   ️👆 I'm validated
    return ok()
  }
}

export const handler = SpamBot.handle
```

![npm-downloads](https://img.shields.io/npm/dt/aws-lambda-handyman)
![npm-version](https://img.shields.io/npm/v/aws-lambda-handyman)
![npm bundle size](https://img.shields.io/bundlephobia/minzip/aws-lambda-handyman)
[![Test, Build and Publish](https://github.com/growx-tech/aws-lambda-handyman/actions/workflows/test-build-publish.yml/badge.svg?branch=master)](https://github.com/growx-tech/aws-lambda-handyman/actions/workflows/test-build-publish.yml)
![coverage](static/coverage-badge.svg)

<p align="center">
    <a href='https://www.growy.nl/' target="_blank">
        <img src="./static/growy-logo.svg" alt="Growy Logo" width="200px">
    </a>
</p>

## Table of Contents

- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Decorators](#decorators)
  - [Method Decorators](#method-decorators)
    - [@Handler()](#handler)
      - [@Handler(options)](#handleroptions-transformvalidateoptions)
      - [Validation and Injection](#validation-and-injection)
      - [Validation Caveats](#validation-caveats)
  - [Function Param Decorators](#function-param-decorators)
    - [@Message()](#message)
    - [@Ctx()](#ctx)
    - [@Paths()](#paths)
    - [@Body()](#body)
    - [@Queries()](#queries)
    - [@HttpHeaders()](#headers)
  - [Transformer Decorators](#transformer-decorators)
    - [@TransformBoolean()](#transformboolean)
- [Http Errors](#httperrors)
- [Http Responses](#httpresponses)

## Installation

First off we need to install the package

```shell
npm i aws-lambda-handyman
```

Since we use `class-validator` and `class-transformer` under the hood we need to install them for their decorators. We also use `reflect-metadata`

```shell
npm i class-transformer class-validator reflect-metadata
```

Next we need to enable these options in our `.tsconfig` file

```json
{
  "experimentalDecorators": true,
  "emitDecoratorMetadata": true
}
```

## Basic Usage

AWS Lambda Handyman accpest both [`class-validator`](https://www.npmjs.com/package/class-validator) classes as [`zod`](https://www.npmjs.com/package/zod) parsable classes.

### class-validator

```typescript
import 'reflect-metadata'

class CustomBodyType {
  @IsEmail()
  email: string
}

class AccountDelete {
  @Handler()
  static async handle(@Body() { email }: CustomBodyType) {
    await deleteAccount(email)
    return ok()
  }
}
```

### Zod

```typescript
const CustomBodySchema = z.object({
  email: z.string().email()
})

class CustomBodyType {
  constructor(input: z.input<typeof CustomBodySchema>) {
    Object.assign(this, CustomBodyType.parse(input))
  }

  // Requires a static parse method
  static parse(input: unknown) {
    return new CustomBody(input as z.input<typeof CustomBodySchema>)
  }
}

class AccountDelete {
  @Handler()
  static async handle(@Body() { email }: CustomBodyType) {
    await deleteAccount(email)
    return ok()
  }
}

export const handler = AccountDelete.handle
```

#### Let's break it down.

1. We import `reflect-metadata`
2. We create a class with the shape we expect `CustomBodyType`
3. We decorate the properties we want validated with any of
   the [decorators of class-validator](https://github.com/typestack/class-validator#validation-decorators)
   e.g. `@IsEmail()`
4. We create a class that would hold our handler method, in this case `AccountDeleteHandler`
   and `static async handle(){}`
5. We decorate `handle()` with the `@Handler()` decorator
6. We decorate the method's parameter with `@Body()` and cast it to the expected shape i.e. `CustomBodyType`
7. We can readily use the automatically validated method parameter, in this case the `@Body() { email }: CustomBodyType`

#### Decorators can be mixed and matched:

```typescript
class KitchenSink {
  @Handler()
  static async handle(
    @Body() body: BodyType,
    @Message() evt: APIGatewayProxyEventBase<T>,
    @Paths() paths: PathsType,
    @Ctx() ctx: Context,
    @Queries() queries: QueriesType
  ) {
    return ok({ body, paths, queries, evt, ctx })
  }
}
```

## Decorators

### Method Decorators

### `@Handler()`

This decorator needs to be applied to the handler of our http event. The handler function **needs** to be `async` or
needs
to return a `Promise`.

```typescript
class AccountDelete {
  @Handler()
  static async handle() {}
}
```

When applied, `@Handler()` enables the following:

1. Validation and injection of method parameters, decorated with [@Paths()](#paths), [@Body()](#body)
   ,[@Queries()](#queries) parameters
2. Injection of method parameters, decorated with [@Message()](#event) and [Ctx()](#ctx)
3. Out of the box error handling and custom error handling via throwing [HttpError](#httperror-)

### `@Handler(options?: TransformValidateOptions)`

Since the `aws-lambda-handyman` uses [class-transformer](https://github.com/typestack/class-transformer)
and [class-validator](https://github.com/typestack/class-validator), you can pass options to the `@Handler` that would
be applied to the transformation and validation of the [decorated](#decorators) method property.

```typescript
import { ValidatorOptions } from 'class-validator/types/validation/ValidatorOptions'
import { ClassTransformOptions } from 'class-transformer/types/interfaces'

export type TransformValidateOptions = ValidatorOptions & ClassTransformOptions
```

## Validation and Injection

Behind the scenes **AWS Lambda Handyman** uses `class-validator` for validation, so if any validation goes wrong we
simply return a 400 with the concatenated `constraints` of
the [ValidationError[]](https://github.com/typestack/class-validator#validation-errors) :

```typescript
class BodyType {
  @IsEmail()
  userEmail: string
  @IsInt({ message: 'My Custom error message 🥸' })
  myInt: number
}

class SpamBot {
  @Handler()
  static async handle(@Body() { userEmail, myInt }: BodyType) {}
}
```

So if the preceding handler gets called with anything other than a body, with the following shape:

```json
{
  "userEmail": "my@mail.gg",
  "myInt": 4321
}
```

The following response is sent:

```text
HTTP/1.1 400 Bad Request
content-type: application/json; charset=utf-8

{
    "message":"userEmail must be an email. My Custom error message 🥸."
}
```

If the incoming request is correct, the decorated property is injected into the method parameter and is ready for use.

## Validation Caveats

By default, **Path** and **Query** parameters come in as strings, so if you try to do something like:

```typescript
class PathType {
  @IsInt()
  intParam: number
}

class HandlerTest {
  @Handler()
  static async handle(@Paths() paths: PathType) {}
}
```

It would return an error. See [Error Handling](#error-handling)

Because `aws-lambda-handyman` uses [class-transformer](https://github.com/typestack/class-transformer), this issue can
be solved in several ways:

1. Decorate the type with a [class-transformer](https://github.com/typestack/class-transformer) decorator

```typescript
class PathType {
  @Type(() => Number) // 👈 Decorator from `class-transformer`
  @IsInt()
  intParam: number
}
```

2. Enable `enableImplicitConversion` in `@Handler(options)`

```typescript
class HandlerTest {
  @Handler({ enableImplicitConversion: true }) // 👈
  static async handle(@Paths() paths: PathType) {}
}
```

Both approaches work in 99% of the time, but sometimes they don't. For example when calling:

`/path?myBool=true`

`/path?myBool=false`

`/path?myBool=123`

`/path?myBool=1`

`/path?myBool=0`

with

```typescript
class QueryTypes {
  @IsBoolean()
  myBool: boolean
}

class HandlerTest {
  @Handler({ enableImplicitConversion: true })
  static async handle(@Queries() { myBool }: QueryTypes) {
    //            myBool is 'true'   👆
  }
}
```

`myBool` would have the value of `true`. Why this happens is explained
here : [Class Transformer Issue 626](https://github.com/typestack/class-transformer/issues/626) because of the
implementation
of [MDN Boolean](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean)

We can fix this in the way described
in [Class Transformer Issue 626,](https://github.com/typestack/class-transformer/issues/626) or we could
use [@TransformBoolean](#transformboolean) like so:

```typescript
class QueryTypes {
  @TransformBoolean() // 👈 use this 🎃
  @IsBoolean()
  myBool: boolean
}

class HandlerTest {
  @Handler()
  static async handle(@Queries() { myBool }: QueryTypes) {}
}
```

So when we call the handler with the previous example we get this:

`/path?myBool=true` 👉 myBool = 'true'

`/path?myBool=false` 👉 myBool = 'false'

`/path?myBool=123` 👉 [Validation error](#validation-and-injection)

`/path?myBool=1` 👉 [Validation error](#validation-and-injection)

`/path?myBool=0` 👉 [Validation error](#validation-and-injection)

## Error handling

Methods, decorated with `@Handler` have automatic error handling. I.e. if an error gets thrown inside the method it
gets wrapped with a http response by default

```typescript
class SpamBot {
  @Handler()
  static async handle() {
    throw new Error("I've fallen... and I can't get up 🐸")
  }
}
```

Returns:

```text
HTTP/1.1 500 Internal Server Error
content-type: application/json; charset=utf-8

{
    "message": "I've fallen... and I can't get up 🐸"
}
```

We could further instrument this by throwing an [HttpError()](#httperror-) , allowing us to specify the response's
message and response code:

```typescript
class SpamBot {
  @Handler()
  static async handle() {
    throw new HttpError(501, 'Oopsie Doopsie 🐸')
  }
}
```

Which returns:

```text
HTTP/1.1 501 Not Implemented
content-type: application/json; charset=utf-8

{
    "message": "Oopsie Doopsie 🐸"
}
```

You could also extend `HttpError` for commonly occurring error types like in [DynamoError()](#dynamoerror)

### Function Param Decorators

### `@Message()`

Injects the `APIGatewayProxyEventBase<T>` object, passed on to the function at runtime.

```typescript
class AccountDelete {
  @Handler()
  static async handle(@Message() evt) {}
}
```

### `@Ctx()`

Injects the `Context` object, passed on to the function at runtime.

```typescript
class AccountDelete {
  @Handler()
  static async handle(@Ctx() context) {}
}
```

### `@Paths()`

Validates the http event's path parameters and injects them into the decorated method parameter.

For example a handler, attached to the path `/cars/{color}` ,would look like so:

```typescript
class PathType {
  @IsHexColor()
  color: string
}

class CarFetch {
  @Handler()
  static async handle(@Paths() paths: PathType) {}
}
```

### `@Body()`

Validates the http event's body and injects them it into the decorated method parameter.

```typescript
class BodyType {
  @IsSemVer()
  appVersion: string
}

class CarHandler {
  @Handler()
  static async handle(@Body() paths: BodyType) {}
}
```

### `@Queries()`

Validates the http event's query parameters and injects them into the decorated method parameter.

For example making a http request like this `/inflated?balloonId={someUUID}` would be handled like this:

```typescript
class QueriesType {
  @IsUUID()
  balloonId: string
}

class IsBalloonInflated {
  @Handler()
  static async handle(@Queries() queries: QueriesType) {}
}
```

### `@HttpHeaders()`

Validates the http event's headers and injects them into the decorated method parameter.

For example making a http request with headers ["authorization" = "Bearer XYZ"] would be handled like this:

```typescript
class HeadersType {
  @IsString()
  @IsNotEmpty()
  authoriation: string
}

class IsBalloonInflated {
  @Handler()
  static async handle(@HttpHeaders() { authoriation }: HeadersType) {}
}
```

## Transformer Decorators

### `@TransformBoolean()`

## HttpErrors

### `HttpError `

### `DynamoError`

## HttpResponses

`response(code: number, body?: object)`

`ok(body?: object)`

`created(body?: object)`

`badRequest(body?: object)`

`unauthorized(body?: object)`

`notFound(body?: object)`

`imaTeapot(body?: object)`

`internalServerError(body?: object)`

# TODO

- [ ] Documentation
  - [ ] add optional example
  - [ ] http responses
  - [ ] http errors
- [ ] Linting
- [ ] add team to collaborators
