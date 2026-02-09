import { APIGatewayEventDefaultAuthorizerContext, APIGatewayProxyEventBase, Context } from 'aws-lambda'
import * as ct from 'class-transformer'
import { Type } from 'class-transformer'
import {
  IsBoolean,
  IsEmail,
  IsFQDN,
  IsHexColor,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsSemVer,
  IsString,
  IsUUID,
  Length,
  ValidateNested
} from 'class-validator'
import 'reflect-metadata'
import { z } from 'zod'
import { Body, Ctx, Event, Handler, Headers, Paths, Queries, defaultInternalServerErrorMessage, handlerNotAsyncMessage } from '../src/Decorators'
import * as mockData from '../test/mock/httpEventContext.json'
import { TransformValidateOptions } from '../src/types'
import { HttpError } from '../src/HttpErrors'
import { TransformBoolean } from '../src/TransformDecorators'

const { event, context, eventWithNoPathParams, eventWithBrokenBody, eventWithBrokenNestedBody, eventWithNoBody, eventWithNoQueries, emptyEvent } =
  mockData
const customMessage = 'Custom message 123 xd teapot bois'
const customCode = 418

test('Handler options', async () => {
  const options: TransformValidateOptions = { enableImplicitConversion: true, forbidUnknownValues: false }

  const spy = jest.spyOn(ct, 'plainToInstance')

  class BodyType {
    email: string
  }

  class PathType {
    intParam: number
  }

  class QueriesType {
    fqdn: boolean
  }

  class HandlerTest {
    @Handler()
    static async handle(@Body() body: BodyType, @Paths() paths: PathType, @Queries() queries: QueriesType) {}
  }

  //@ts-ignore
  await HandlerTest.handle(event, context)

  expect(spy).toHaveBeenCalledWith(BodyType, JSON.parse(event.body), options)
  expect(spy).toHaveBeenCalledWith(PathType, event.pathParameters, options)
  expect(spy).toHaveBeenCalledWith(QueriesType, event.queryStringParameters, options)
})

test('Handler method is not async', () => {
  class HandlerToTest {
    @Handler()
    static handle() {}
  }

  expect(() => {
    HandlerToTest.handle()
  }).toThrow(handlerNotAsyncMessage)
})

test('Handler no params test', async () => {
  class HandlerTest {
    @Handler()
    static async handle() {
      return arguments
    }
  }

  //@ts-ignore
  const calledArgs = await HandlerTest.handle(event, context)

  expect(calledArgs.length).toEqual(0)
})

test('Handler catches thrown HttpError', async () => {
  class HandlerTest {
    @Handler()
    static async handle() {
      throw new HttpError(customCode, customMessage)
    }
  }

  const { statusCode, body }: any = await HandlerTest.handle()

  expect(statusCode).toEqual(customCode)
  expect(body).toContain(customMessage)
})

test('Handler catches regular Error with message', async () => {
  class HandlerTest {
    @Handler()
    static async handle() {
      throw new Error(customMessage)
    }
  }

  const { statusCode, body }: any = await HandlerTest.handle()

  expect(statusCode).toEqual(500)
  expect(body).toContain(customMessage)
})

test('Handler catches regular Error with message', async () => {
  class HandlerTest {
    @Handler()
    static async handle() {
      throw new Error()
    }
  }

  const { statusCode, body }: any = await HandlerTest.handle()

  expect(statusCode).toEqual(500)
  expect(body).toContain(defaultInternalServerErrorMessage)
})

test('Handler catches regular Error with message', async () => {
  class HandlerTest {
    @Handler()
    static async handle() {
      throw new Error()
    }
  }

  const { statusCode, body }: any = await HandlerTest.handle()

  expect(statusCode).toEqual(500)
  expect(body).toContain(defaultInternalServerErrorMessage)
})

test('Handler has Event param', async () => {
  class HandlerTest {
    @Handler()
    static async handle(
      @Event()
      event: APIGatewayProxyEventBase<APIGatewayEventDefaultAuthorizerContext>
    ) {
      return arguments
    }
  }

  //@ts-ignore
  const calledWithArgs = await HandlerTest.handle(event, context)

  expect(calledWithArgs.length).toEqual(1)

  const [injectedEvent] = calledWithArgs

  expect(JSON.stringify(injectedEvent)).toEqual(JSON.stringify(event))
})

test('Handler has Ctx param', async () => {
  class HandlerTest {
    @Handler()
    static async handle(@Ctx() ctx: Context) {
      return arguments
    }
  }

  //@ts-ignore
  const calledWithArgs = await HandlerTest.handle(event, context)

  expect(calledWithArgs.length).toEqual(1)

  const [injectedContext] = calledWithArgs

  expect(JSON.stringify(injectedContext)).toEqual(JSON.stringify(context))
})

test('Handler has Paths param, and is called with expected payload', async () => {
  class PathType {
    @Type(() => Number)
    @IsInt()
    intParam: number
  }

  class HandlerTest {
    @Handler()
    static async handle(@Paths() paths: PathType) {
      return arguments
    }
  }

  //@ts-ignore
  const calledWithArgs = await HandlerTest.handle(event, context)

  expect(calledWithArgs.length).toEqual(1)

  const [injectedPaths] = calledWithArgs
  expect(injectedPaths.intParam).toEqual(Number(event.pathParameters.intParam))
})

test('Handler has Paths param, and is called with unexpected payload', async () => {
  class PathType {
    @IsInt()
    @Type(() => Number)
    intParam: number
    @IsEmail()
    emailParam: string
    @IsHexColor()
    hexColor: string
  }

  class HandlerTest {
    @Handler()
    static async handle(@Paths() paths: PathType) {}
  }

  //@ts-ignore
  const { statusCode: statusCodeNoPaths, body: bodyNoPaths } = await HandlerTest.handle(eventWithNoPathParams, context)
  expect(statusCodeNoPaths).toEqual(400)
  expect(bodyNoPaths).toContain('intParam')
  expect(bodyNoPaths).toContain('emailParam')
  expect(bodyNoPaths).toContain('hexColor')

  //@ts-ignore
  const { statusCode, body } = await HandlerTest.handle(event, context)

  expect(statusCode).toEqual(400)
  expect(body).not.toContain('intParam')
  expect(body).toContain('emailParam')
  expect(body).toContain('hexColor')
})

test('Handler has Body param, and is called with expected payload', async () => {
  class BodyType {
    @IsEmail()
    email: string
  }

  class HandlerTest {
    @Handler()
    static async handle(@Body() body: BodyType) {
      return arguments
    }
  }

  //@ts-ignore
  const calledWithArgs = await HandlerTest.handle(event, context)

  expect(calledWithArgs.length).toEqual(1)

  const [injectedBody] = calledWithArgs
  expect(injectedBody.email).toEqual(JSON.parse(event.body).email)
})

test('Handler has Body parram, and is called with expected zod payload', async () => {
  const BodySchema = z.object({
    email: z.string().email()
  })

  class BodyType {
    constructor(input: z.input<typeof BodySchema>) {
      Object.assign(this, BodySchema.parse(input))
    }

    static parse(input: unknown) {
      return new BodyType(input as z.input<typeof BodySchema>)
    }
  }

  class HandlerTest {
    @Handler()
    static async handle(@Body() body: BodyType) {
      return arguments
    }
  }

  //@ts-ignore
  const calledWithArgs = await HandlerTest.handle(event, context)

  expect(calledWithArgs.length).toEqual(1)

  const [injectedBody] = calledWithArgs
  expect(injectedBody.email).toEqual(JSON.parse(event.body).email)
})

test('Handler has Body param, and is called with unexpected payload', async () => {
  class BodyType {
    @IsEmail()
    email: string
    @IsBoolean()
    customBool: string
  }

  class HandlerTest {
    @Handler()
    static async handle(@Body() body: BodyType) {}
  }

  //@ts-ignore
  const { statusCode, body } = await HandlerTest.handle(event, context)
  expect(statusCode).toEqual(400)
  expect(body).not.toContain('email')
  expect(body).toContain('customBool')
})

test('Handler has Body with optional parameter, and is called with unexpected payload', async () => {
  const message = 'okie dokie 👽'

  class BodyType {
    @IsOptional()
    @IsNumber()
    weight?: number
  }

  class HandlerTest {
    @Handler()
    static async handle(@Body() body: BodyType) {
      return { message }
    }
  }

  //@ts-ignore
  const { message: received } = await HandlerTest.handle(eventWithBrokenBody, context)

  expect(message).toEqual(received)
})

test('Handler has Body param, and is called with payload having nested objects with errors', async () => {
  class InnerNested {
    @IsString()
    @Length(5, 7)
    name: string
    @IsString()
    lastName: string
  }

  class Nested {
    @IsNumber()
    weight: number
    @Type(() => InnerNested)
    @ValidateNested()
    innerNested: InnerNested
  }

  class BodyType {
    @IsEmail()
    email: string
    @IsBoolean()
    customBool: string
    @Type(() => Nested)
    @ValidateNested()
    nested: Nested
  }

  class HandlerTest {
    @Handler()
    static async handle(@Body() body: BodyType) {}
  }

  //@ts-ignore
  const { statusCode, body } = await HandlerTest.handle(eventWithBrokenNestedBody, context)

  expect(statusCode).toEqual(400)
  expect(body).not.toContain('email')
  expect(body).toContain('customBool')
  expect(body).toContain('name')
  expect(body).toContain('lastName')
  expect(body).toContain('must be longer')
  expect(body).toContain('weight')
})

test('Handler has Queries param, and is called with expected payload', async () => {
  class QueriesType {
    @IsSemVer()
    version: string
    @TransformBoolean()
    @IsBoolean()
    pumpOne: boolean
  }

  class HandlerTest {
    @Handler()
    static async handle(@Queries() queries: QueriesType) {
      return arguments
    }
  }

  //@ts-ignore
  const calledWithArgs = await HandlerTest.handle(event, context)

  expect(calledWithArgs.length).toEqual(1)

  const [injectedQueries] = calledWithArgs
  expect(injectedQueries.version).toEqual(event.queryStringParameters.version)
})

test('Handler has Queries param, and is called with unexpected payload', async () => {
  class QueriesType {
    @IsSemVer()
    version: string
    @IsUUID()
    uuid: string
    @IsFQDN()
    fqdn: boolean
  }

  class HandlerTest {
    @Handler()
    static async handle(@Queries() queries: QueriesType) {}
  }

  //@ts-ignore
  const { statusCode: codeNoQuereis, body: bodyNoQuereies } = await HandlerTest.handle(eventWithNoQueries, context)
  expect(codeNoQuereis).toEqual(400)
  expect(bodyNoQuereies).toContain('version')
  expect(bodyNoQuereies).toContain('uuid')
  expect(bodyNoQuereies).toContain('fqdn')

  //@ts-ignore
  const { statusCode, body } = await HandlerTest.handle(event, context)

  expect(statusCode).toEqual(400)
  expect(body).not.toContain('version')
  expect(body).toContain('uuid')
  expect(body).toContain('fqdn')
})

test('Handler has Headers param, and is called with expected payload', async () => {
  class HeadersType {
    @IsString()
    @IsNotEmpty()
    authorization: string
  }

  class HandlerTest {
    @Handler()
    static async handle(@Headers() headers: HeadersType) {
      return arguments
    }
  }

  //@ts-ignore
  const calledWithArgs = await HandlerTest.handle(event, context)

  expect(calledWithArgs.length).toEqual(1)

  const [injectedHeaders] = calledWithArgs
  expect(injectedHeaders.authorization).toEqual(event.headers.authorization)
})

test('Handler has Headers param, and is called with unexpected payload', async () => {
  class HeadersType {
    @IsString()
    @IsNotEmpty()
    authorization: string
  }

  class HandlerTest {
    @Handler()
    static async handle(@Headers() headers: HeadersType) {
      return arguments
    }
  }

  //@ts-ignore
  const { statusCode: codeNoHeaders, body: bodyNoHeaders } = await HandlerTest.handle(emptyEvent, context)
  expect(codeNoHeaders).toEqual(400)
  expect(bodyNoHeaders).toContain('authorization')
})
