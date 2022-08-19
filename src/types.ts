import { ValidatorOptions } from 'class-validator/types/validation/ValidatorOptions'
import { ClassTransformOptions } from 'class-transformer/types/interfaces'

export type TransformValidateOptions = ValidatorOptions & ClassTransformOptions
