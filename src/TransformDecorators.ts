import { Transform } from 'class-transformer'

export function TransformBoolean(): PropertyDecorator {
  return Transform(({ value }) => {
    if (value === true || value === 'true')
      return true
    else if (value === false || value === 'false')
      return false
    else return value
  })
}
