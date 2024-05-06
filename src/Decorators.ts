import { APIGatewayEventDefaultAuthorizerContext, APIGatewayProxyEventBase, Context } from 'aws-lambda'
import { ClassConstructor, plainToInstance } from 'class-transformer'
import { validateSync, ValidationError } from 'class-validator'
import 'reflect-metadata'
import { ZodError, ZodSchema } from 'zod'
import { badRequest, HttpError, internalServerError, response, TransformValidateOptions } from '.'

const eventMetadataKey = Symbol('Event')
const contextMetadataKey = Symbol('Ctx')
const pathsMetadataKey = Symbol('Paths')
const headersMetadataKey = Symbol('Headers')
const bodyMetadataKey = Symbol('Body')
const queriesMetadataKey = Symbol('Queries')

const defaultHandlerOptions = { enableImplicitConversion: true, forbidUnknownValues: false }

export const defaultInternalServerErrorMessage = 'Oops, something went wrong 😬'
export const bodyIsNotProperJSON = `The request's body is not proper JSON 🤔`
export const handlerNotAsyncMessage = '⚠️ Methods, decorated with @Handler, need to be async / need to return a Promise ⚠️'

export function Event() {
  return (target: Object, propertyKey: string | symbol, parameterIndex: number) => {
    Reflect.defineMetadata(eventMetadataKey, parameterIndex, target, propertyKey)
  }
}

export function Ctx() {
  return (target: Object, propertyKey: string | symbol, parameterIndex: number) => {
    Reflect.defineMetadata(contextMetadataKey, parameterIndex, target, propertyKey)
  }
}

export function Paths() {
  return (target: Object, propertyKey: string | symbol, parameterIndex: number) => {
    Reflect.defineMetadata(pathsMetadataKey, parameterIndex, target, propertyKey)
  }
}

export function Body() {
  return (target: Object, propertyKey: string | symbol, parameterIndex: number) => {
    Reflect.defineMetadata(bodyMetadataKey, parameterIndex, target, propertyKey)
  }
}

export function Queries() {
  return (target: Object, propertyKey: string | symbol, parameterIndex: number) => {
    Reflect.defineMetadata(queriesMetadataKey, parameterIndex, target, propertyKey)
  }
}

export function Headers() {
  return (target: Object, propertyKey: string | symbol, parameterIndex: number) => {
    Reflect.defineMetadata(headersMetadataKey, parameterIndex, target, propertyKey)
  }
}

export function Handler(options: TransformValidateOptions = defaultHandlerOptions) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    let method = descriptor.value

    descriptor.value = function () {
      try {
        const paramTypes: ClassConstructor<any>[] = Reflect.getMetadata('design:paramtypes', target, propertyKey)

        const event: APIGatewayProxyEventBase<APIGatewayEventDefaultAuthorizerContext> = arguments[0]
        const context: Context = arguments[1]

        const newArguments: any[] = []

        const eventParam: number | undefined = Reflect.getOwnMetadata(eventMetadataKey, target, propertyKey)
        if (eventParam !== undefined) {
          newArguments[eventParam] = event
        }

        const contextParam: number | undefined = Reflect.getOwnMetadata(contextMetadataKey, target, propertyKey)
        if (contextParam !== undefined) {
          newArguments[contextParam] = context
        }

        const pathsParamIndex: number | undefined = Reflect.getOwnMetadata(pathsMetadataKey, target, propertyKey)
        if (pathsParamIndex !== undefined) {
          const pathsInstance = transformValidateOrReject(paramTypes[pathsParamIndex], event.pathParameters ?? {}, options)

          newArguments[pathsParamIndex] = pathsInstance
        }

        const bodyParamIndex: number | undefined = Reflect.getOwnMetadata(bodyMetadataKey, target, propertyKey)
        if (bodyParamIndex !== undefined) {
          let body = parseBody(event.body)

          const bodyInstance = transformValidateOrReject(paramTypes[bodyParamIndex], body, options)

          newArguments[bodyParamIndex] = bodyInstance
        }

        // TODO: handle multiValueQueryStringParameters
        const queriesParamIndex: number | undefined = Reflect.getOwnMetadata(queriesMetadataKey, target, propertyKey)
        if (queriesParamIndex !== undefined) {
          const queriesInstance = transformValidateOrReject(paramTypes[queriesParamIndex], event.queryStringParameters ?? {}, options)

          newArguments[queriesParamIndex] = queriesInstance
        }

        const headersParamIndex: number | undefined = Reflect.getOwnMetadata(headersMetadataKey, target, propertyKey)
        if (headersParamIndex !== undefined) {
          const headersInstance = transformValidateOrReject(paramTypes[headersParamIndex], event.headers ?? {}, options)

          newArguments[headersParamIndex] = headersInstance
        }

        return method.apply(this, newArguments).catch((e: any) => {
          console.error(e)
          if (e instanceof HttpError) {
            return response(e.code, { message: e.message })
          }

          const message = e.message || defaultInternalServerErrorMessage

          return internalServerError({ message })
        })
      } catch (e) {
        if (e instanceof Array && e?.[0] instanceof ValidationError) return badRequest({ message: validationErrorsToMessage(e) })
        if (e instanceof ZodError) return badRequest({ message: zodErrorToMessage(e) })

        console.error('Oops 😬', e)
        if (e instanceof TypeError && e.message === `Cannot read properties of undefined (reading 'catch')`) throw new Error(handlerNotAsyncMessage)
      }
    }
  }
}

function transformValidateOrReject<T extends object, V extends object>(cls: ClassConstructor<T>, plain: V, options?: TransformValidateOptions): T {
  if ('parse' in cls && typeof (cls as unknown as ZodSchema<T>)['parse'] === 'function') {
    return transformUsingZod(cls as unknown as ZodSchema<T>, plain)
  }

  return transformUsingClassTransformer(cls, plain, options)
}

function transformUsingZod<T extends object, V extends object>(schema: ZodSchema<T>, plain: V): T {
  return schema.parse(plain)
}

function transformUsingClassTransformer<T extends object, V extends object>(
  cls: ClassConstructor<T>,
  plain: V,
  options?: TransformValidateOptions
): T {
  const instance = plainToInstance(cls, plain, options)
  const validationErrors = validateSync(instance, options)

  if (validationErrors.length) throw validationErrors

  return instance
}

function validationErrorsToMessage(errors: ValidationError[]) {
  return errors.map((e) => getConstraints(e).join(', ')).join('. ') + '.'
}

function zodErrorToMessage(error: ZodError) {
  return error.errors.map((e) => `${e.path.join(' -> ')}: ${e.message}`).join(', ') + '.'
}

function getConstraints(error: ValidationError): string[] {
  if (!error.children || !error.children.length) {
    return Object.values(error.constraints || [])
  }

  return error.children.reduce((constraints: string[], e: ValidationError) => {
    constraints.push(...getConstraints(e))
    return constraints
  }, [])
}

function parseBody(body: string | null) {
  let parsedBody = {}

  try {
    parsedBody = JSON.parse(body ?? '{}')
  } catch (e) {
    console.warn(bodyIsNotProperJSON, body, e)
  }

  return parsedBody
}
