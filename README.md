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

[![Test, Build and Publish](https://github.com/growx-tech/aws-lambda-handyman/actions/workflows/npm-publish.yml/badge.svg?branch=master)](https://github.com/growx-tech/aws-lambda-handyman/actions/workflows/npm-publish.yml)

## Table of Contents

- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Decorators](#decorators)
    - [Method Decorators](#method-decorators)
        - [@Handler()](#handler)
    - [Function Param Decorators](#function-param-decorators)
        - [@Event()](#event)
        - [@Ctx()](#ctx)
        - [@Paths()](#paths)
        - [@Body()](#body)
        - [@Queries()](#queries)
- [Http Errors](#httperrors)
- [Http Responses](#httpresponses)

## Installation

First off we need to install the package

```shell
npm i aws-lambda-handyman
```

Since we use ```class-validator``` under the hood we need to install it for its validation decorators

```shell
npm i class-validator
```

Next we need to enable these options in our ```.tsconfig``` file

```json
{
  "experimentalDecorators": true,
  "emitDecoratorMetadata": true
}
```

## Basic Usage

[//]: # (TODO account delete rename into something different for different iterations)

```typescript
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

export const handler = AccountDelete.handle
```

#### Let's break it down.

1. We create a class with the shape we expect ```CustomBodyType```
2. We decorate the properties we want validated with any of
   the [decorators of class-validator](https://github.com/typestack/class-validator#validation-decorators)
   e.g. ```@IsEmail()```
3. We create a class that would hold our handler method, in this case ```AccountDeleteHandler```
   and ```static async handle(){}```
4. We decorate ```handle()``` with the ```@Handler()``` decorator
5. We decorate the method's parameter with ```@Body()``` and cast it to the expected shape i.e. ```CustomBodyType```
6. ???
7. We can readily use the automatically validated method parameter, in this case the 🅱️ody

#### Decorators can be mixed and matched:

```typescript
class KitchenSink {
  @Handler()
  static async handle(@Body() body: BodyType,
                      @Event() evt: APIGatewayProxyEventBase<T>,
                      @Paths() paths: PathsType,
                      @Ctx() ctx: Context,
                      @Queries() queries: QueriesType) {
    return ok({ body, paths, queries, evt, ctx })
  }
}
```

[//]: #  (TODO show what happens when the request doesn't comply)

## Decorators

### Method Decorators

### ```@Handler()```

This decorator needs to be applied to the handler of our http event. The handler function **needs** to be `async` or
needs
to return a `Promise`.

```typescript
class AccountDelete {
  @Handler()
  static async handle() {
  }
}
```

When applied, `@Handler()` enables the following:

1. Validation and injection of method parameters, decorated with [@Paths()](#paths), [@Body()](#body)
   ,[@Queries()](#queries) parameters
2. Injection of method parameters, decorated with [@Event()](#event) and [Ctx()](#ctx)
3. Out of the box error handling and custom error handling via throwing [HttpError](#httperror-)

## Validation and Injection

Behind the scenes **AWS Lambda Handyman** uses `class-validator` for validation, so if any validation goes wrong we
simply return a 400 with the `constraints` of
the `ValidationError[]`[click](https://github.com/typestack/class-validator#validation-errors) :

```typescript
class BodyType {
  @IsEmail()
  email: string
}

class SpamBot {
  @Handler()
  static async handle(@Body() { email }: BodyType) {
  }
}
```

So if the preceding handler gets called with anything other than a body, containing:

```json
{
  "email": "*some email*"
}
```

The following response is sent:

```json
HTTP/1.1 400 Bad Request
content-type: application/json; charset=utf-8

[{"isEmail": "email must be an email"}]
```

If there received request is correct, the decorated property is injected into the method parameter, is ready for use.

## Error handling

Methods, decorated with `@Handler` have automatic error handling. I.e. if an error gets thrown inside of the method it
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

```json
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
    throw new HttpError('Oopsie Doopsie 🐸', 501)
  }
}
```

Which returns:

```json
HTTP/1.1 501 Not Implemented
content-type: application/json; charset=utf-8

{
"message": "Oopsie Doopsie 🐸"
}
```

You could also extend `HttpError` for commonly occuring error types like in [DynamoError()](#dynamoerror)

### Function Param Decorators

### ```@Event()```

Injects the `APIGatewayProxyEventBase<T>` object, passed on to the function at runtime.

```typescript
class AccountDelete {
  @Handler()
  static async handle(@Event() evt) {
  }
}
```

### ```@Ctx()```

Injects the `Context` object, passed on to the function at runtime.

```typescript
class AccountDelete {
  @Handler()
  static async handle(@Ctx() context) {
  }
}
```

### ```@Paths()```

Validates the http event's path parameters and injects them into the decorated method parameter.

For example a handler, attached to the path `/cars/{color}` ,would look like so:

```typescript
class PathType {
  @IsHexColor()
  color: string
}

class CarFetch {
  @Handler()
  static async handle(@Paths() paths: PathType) {
  }
}
```

### ```@Body()```

Validates the http event's body and injects them it into the decorated method parameter.

```typescript
class BodyType {
  @IsSemVer()
  appVersion: string
}

class CarHandler {
  @Handler()
  static async handle(@Body() paths: BodyType) {
  }
}
```

### ```@Queries()```

Validates the http event's query parameters and injects them into the decorated method parameter.

For example making a http request like this `/inflated?balloonId={someUUID}` would be handled like this:

```typescript
class QueriesType {
  @IsUUID()
  balloonId: string
}

class IsBalloonInflated {
  @Handler()
  static async handle(@Queries() queries: QueriesType) {
  }
}
```

## HttpErrors

### ```HttpError ```

### `DynamoError`

## HttpResponses

```response(code: number, body?: object)```

```ok(body?: object)```

```created(body?: object)```

```badRequest(body?: object)```

```unauthorized(body?: object)```

```notFound(body?: object)```

```imaTeapot(body?: object)```

```internalServerError(body?: object)```

# TODO

- [ ] Documentation
    - [ ] http responses
    - [ ] http errors
- [ ] add 'reflect-metadata' in installation
- [ ] Linting
- [ ] Prettier
- [ ] possibly cull undefined properties in validated objects
- [ ] non promise response functions
- [ ] add Growy logo
- [ ] setup branch protection
- [ ] add coverage badge
