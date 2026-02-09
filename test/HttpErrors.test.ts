import { DYNAMO_ERROR_MESSAGE, DynamoError, HttpError } from '../src/HttpErrors'

const customErrorMessage = 'Tony Hawk just did a 50/50 on the DynamoDB server and it crashed :('

test('DynamoError', () => {
  expect(DynamoError).toThrow(new HttpError(500, DYNAMO_ERROR_MESSAGE))
  expect(() => DynamoError(customErrorMessage)).toThrow(new HttpError(500, customErrorMessage))
})
