export const DYNAMO_ERROR_MESSAGE = 'There was an error while performing a DynamoDB operation.'

export class HttpError extends Error {
  constructor(
    public code: number,
    public message: string
  ) {
    super(message)
  }
}

export function DynamoError(message = DYNAMO_ERROR_MESSAGE): never {
  throw new HttpError(500, message)
}
