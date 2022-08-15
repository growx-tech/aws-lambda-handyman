import 'reflect-metadata'
import { APIGatewayEventDefaultAuthorizerContext, APIGatewayProxyEventBase, Context } from 'aws-lambda'
import { validateSync } from 'class-validator'
import { ClassConstructor, plainToInstance } from 'class-transformer'
import { HttpError } from '.'
import { badRequest, internalServerError, response } from '.'

const eventMetadataKey = Symbol('Event')
const contextMetadataKey = Symbol('Ctx')
const pathsMetadataKey = Symbol('Paths')
const bodyMetadataKey = Symbol('Body')
const queriesMetadataKey = Symbol('Queries')

export const defaultInternalServerErrorMessage = 'Oops, something went wrong 😬'
export const bodyIsNotProperJSON = 'Provided body is not proper JSON 😬'
export const handlerNotAsyncMessage = '⚠️ The methods that you attach the @Handler decorator to need be async / need to return a Promise ⚠️ '

export function Event() {
  return function(target: Object, propertyKey: string | symbol, parameterIndex: number) {
    Reflect.defineMetadata(eventMetadataKey, parameterIndex, target, propertyKey)
  }
}

export function Ctx() {
  return function(target: Object, propertyKey: string | symbol, parameterIndex: number) {
    Reflect.defineMetadata(contextMetadataKey, parameterIndex, target, propertyKey)
  }
}

export function Paths() {
  return function(target: Object, propertyKey: string | symbol, parameterIndex: number) {
    Reflect.defineMetadata(pathsMetadataKey, parameterIndex, target, propertyKey)
  }
}

export function Body() {
  return function(target: Object, propertyKey: string | symbol, parameterIndex: number) {
    Reflect.defineMetadata(bodyMetadataKey, parameterIndex, target, propertyKey)
  }
}

export function Queries() {
  return function(target: Object, propertyKey: string | symbol, parameterIndex: number) {
    Reflect.defineMetadata(queriesMetadataKey, parameterIndex, target, propertyKey)
  }
}

export function Handler() {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    let method = descriptor.value

    descriptor.value = function() {
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
          const pathsInstance = plainToInstance(paramTypes[pathsParamIndex], event.pathParameters ?? {}, { enableImplicitConversion: true })
          const validationErrors = validateSync(pathsInstance)
          if (validationErrors.length) {
            return badRequest(validationErrors.map(err => err.constraints))
          }

          newArguments[pathsParamIndex] = pathsInstance
        }

        const bodyParamIndex: number | undefined = Reflect.getOwnMetadata(bodyMetadataKey, target, propertyKey)
        if (bodyParamIndex !== undefined) {
          let body: object
          try {
            body = JSON.parse(event.body ?? '')
          } catch (e) {
            console.log(e)
            return badRequest({ message: bodyIsNotProperJSON })
          }

          const bodyInstance = plainToInstance(paramTypes[bodyParamIndex], body)
          const validationErrors = validateSync(bodyInstance)
          if (validationErrors.length) {
            return badRequest(validationErrors.map(err => err.constraints))
          }

          newArguments[bodyParamIndex] = bodyInstance
        }

        // TODO: handle multiValueQueryStringParameters
        const queriesParamIndex: number | undefined = Reflect.getOwnMetadata(queriesMetadataKey, target, propertyKey)
        if (queriesParamIndex !== undefined) {
          const queriesInstance = plainToInstance(paramTypes[queriesParamIndex], event.queryStringParameters ?? {}, {
            enableImplicitConversion: true
          })

          const validationErrors = validateSync(queriesInstance)
          if (validationErrors.length) {
            return badRequest(validationErrors.map(err => err.constraints))
          }

          newArguments[queriesParamIndex] = queriesInstance
        }

        return method.apply(this, newArguments).catch((e: any) => {
          if (e instanceof HttpError) {
            return response(e.code, { message: e.message })
          }

          const message = e.message || defaultInternalServerErrorMessage

          return internalServerError({ message })
        })
      } catch (e) {
        console.error('Oops 😬', e)
        if (e instanceof TypeError && e.message === `Cannot read properties of undefined (reading 'catch')`)
          throw new Error(handlerNotAsyncMessage)
      }
    }
  }
}
