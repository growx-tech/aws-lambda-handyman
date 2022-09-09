import { DYNAMO_ERROR_MESSAGE, DynamoError, HttpError } from '../src'

const customErrorMessage = 'Tony Hawk just did a 50/50 on the DynamoDB server and it crashed :('

test('DynamoError', () => {
  expect(DynamoError).toThrowError(new HttpError(500, DYNAMO_ERROR_MESSAGE))
  expect(() => DynamoError(customErrorMessage)).toThrowError(new HttpError(500, customErrorMessage))
})
