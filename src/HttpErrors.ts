export const DYNAMO_ERROR_MESSAGE = 'There was an error while performing a DynamoDB operation'

export class HttpError extends Error {
  constructor(public message: string, public code: number) {
    super(message)
  }
}

export function DynamoError(message = DYNAMO_ERROR_MESSAGE, code = 500): never {
  throw new HttpError(message, code)
}
