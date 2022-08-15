import { DYNAMO_ERROR_MESSAGE, DynamoError, HttpError } from '../src'

const customErrorMessage = 'Tony Hawk just did a 50/50 on the DynamoDB server and it crashed :('
const customErrorHttpCode = 418

test('DynamoError', () => {
  expect(DynamoError).toThrowError(new HttpError(DYNAMO_ERROR_MESSAGE, 500))
  expect(() => DynamoError(customErrorMessage, customErrorHttpCode)).toThrowError(new HttpError(customErrorMessage, customErrorHttpCode))
})
