import { plainToInstance } from 'class-transformer'
import { TransformBoolean } from '../src/TransformDecorators'

test('@TransformBoolean()', async () => {
  class TransQuery {
    @TransformBoolean()
    myBool: boolean
  }

  expect(plainToInstance(TransQuery, { myBool: false })).toEqual({ myBool: false })
  expect(plainToInstance(TransQuery, { myBool: true })).toEqual({ myBool: true })

  expect(plainToInstance(TransQuery, { myBool: 'false' })).toEqual({ myBool: false })
  expect(plainToInstance(TransQuery, { myBool: 'true' })).toEqual({ myBool: true })

  expect(plainToInstance(TransQuery, { myBool: 1 })).toEqual({ myBool: 1 })
  expect(plainToInstance(TransQuery, { myBool: 'xd123' })).toEqual({ myBool: 'xd123' })
})
