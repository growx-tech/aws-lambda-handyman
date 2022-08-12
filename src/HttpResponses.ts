import { APIGatewayProxyResult } from 'aws-lambda'

// Todo change to non promise and wrap on call
export async function response(code: number, body: object | undefined | null = {}): Promise<APIGatewayProxyResult> {
  return {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Methods': '*',
      'Access-Control-Allow-Origin': '*'
    },
    statusCode: code,
    body: JSON.stringify(body)
  }
}

export const ok = (body?: object) => response(200, body)

export const created = (body?: object) => response(201, body)

export const badRequest = (body?: object) => response(400, body)

export const unauthorized = (body?: object) => response(401, body)

export const notFound = (body?: object) => response(404, body)

export const imaTeapot = (body?: object) => response(418, body)

export const internalServerError = (body?: object) => response(500, body)
