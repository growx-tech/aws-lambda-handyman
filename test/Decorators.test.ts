import {
  Body,
  bodyIsNotProperJSON,
  Ctx,
  defaultInternalServerErrorMessage,
  Event,
  Handler,
  handlerNotAsyncMessage,
  HttpError,
  Paths,
  Queries,
  TransformBoolean,
  TransformValidateOptions
} from '../src'
import 'reflect-metadata'
import * as mockData from '../test/mock/httpEventContext.json'
import { APIGatewayEventDefaultAuthorizerContext, APIGatewayProxyEventBase, Context } from 'aws-lambda'
import { IsBoolean, IsEmail, IsFQDN, IsHexColor, IsInt, IsNumber, IsSemVer, IsString, IsUUID, Length, ValidateNested } from 'class-validator'
import * as ct from 'class-transformer'
import { Type } from 'class-transformer'

const { event, context, eventWithNoPathParams, eventWithBrokenBody, eventWithBrokenNestedBody, eventWithNoBody, eventWithNoQueries } = mockData
const customMessage = 'Custom message 123 xd teapot bois'
const customCode = 418

test('Handler options', async () => {
  const options: TransformValidateOptions = { enableImplicitConversion: true }

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
    @Handler(options)
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
  }).toThrowError(handlerNotAsyncMessage)
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
  const { statusCode: codeBrokenJSON, body: bodyBrokenJson } = await HandlerTest.handle(eventWithBrokenBody, context)

  expect(codeBrokenJSON).toEqual(400)
  expect(bodyBrokenJson).toContain(bodyIsNotProperJSON)

  //@ts-ignore
  const { statusCode: statusCodeNoBody, body: bodyNoBody } = await HandlerTest.handle(eventWithNoBody, context)

  expect(statusCodeNoBody).toEqual(400)
  expect(bodyNoBody).toContain(bodyIsNotProperJSON)

  //@ts-ignore
  const { statusCode, body } = await HandlerTest.handle(event, context)
  expect(statusCode).toEqual(400)
  expect(body).not.toContain('email')
  expect(body).toContain('customBool')
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
