<p align="center">
  <h1 align="center">AWS Lambda Handyman</h1>
  <p align="center">
AWS Lambda validation made easy 🏄‍♀ ...️and some other things
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

## Table of Contents

- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Decorators](#decorators)
    - [Method Decorators](#method-decorators)
    - [Function Param Decorators](#function-param-decorators)
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
  static async handle(@Event() evt: APIGatewayProxyEventBase<T>,
                      @Ctx() ctx: Context,
                      @Body() body: BodyType,
                      @Paths() paths: PathsType,
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

```ok(body?: object)```

```created(body?: object)```

```badRequest(body?: object)```

```unauthorized(body?: object)```

```notFound(body?: object)```

```imaTeapot(body?: object)```

```internalServerError(body?: object)```

# TODO

- [ ] add 'reflect-metadata' in installation
- [ ] Linting
- [ ] Prettier
- [ ] Documentation
- [ ] possibly cull undefined properties in validated objects
- [ ] rollup build to minify package
- [ ] non promise response functions
- [ ] add Growy logo
- [ ] setup branch protection
- [ ] add keywords to package.json
- [ ] possibly setup husky to enforce version ++
