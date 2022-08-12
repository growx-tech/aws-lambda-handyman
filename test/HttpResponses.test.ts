import {
  badRequest,
  created,
  imaTeapot,
  internalServerError,
  notFound,
  ok,
  response,
  unauthorized
} from '../src/HttpResponses'

const customBody = { message: `Hi, look at me! I'm a test message 🙌` }

test('response', async () => {
  const badRequestResponse = await response(421)

  expect(badRequestResponse.statusCode).toEqual(421)
  expect(badRequestResponse.body).toEqual(JSON.stringify({}))
})

test('ok', async () => {
  const okResponse = await ok(customBody)

  expect(okResponse.statusCode).toEqual(200)
  expect(okResponse.body).toEqual(JSON.stringify(customBody))
})

test('created', async () => {
  const createdResponse = await created(customBody)

  expect(createdResponse.statusCode).toEqual(201)
  expect(createdResponse.body).toEqual(JSON.stringify(customBody))
})

test('badRequest', async () => {
  const badRequestResponse = await badRequest(customBody)

  expect(badRequestResponse.statusCode).toEqual(400)
  expect(badRequestResponse.body).toEqual(JSON.stringify(customBody))
})

test('unauthorized', async () => {
  const unauthorizedResponse = await unauthorized(customBody)

  expect(unauthorizedResponse.statusCode).toEqual(401)
  expect(unauthorizedResponse.body).toEqual(JSON.stringify(customBody))
})

test('notFound', async () => {
  const notFoundResponse = await notFound(customBody)

  expect(notFoundResponse.statusCode).toEqual(404)
  expect(notFoundResponse.body).toEqual(JSON.stringify(customBody))
})

test('imaTeapot', async () => {
  const imaTeapotResponse = await imaTeapot(customBody)

  expect(imaTeapotResponse.statusCode).toEqual(418)
  expect(imaTeapotResponse.body).toEqual(JSON.stringify(customBody))
})

test('internalServerError', async () => {
  const internalServerErrorResponse = await internalServerError(customBody)

  expect(internalServerErrorResponse.statusCode).toEqual(500)
  expect(internalServerErrorResponse.body).toEqual(JSON.stringify(customBody))
})
