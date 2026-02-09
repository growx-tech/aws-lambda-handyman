import type { Config } from '@jest/types'

const config: Config.InitialOptions = {
  verbose: true,
  silent: true,
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['./test'],
  collectCoverage: true,
  coverageReporters: ['json-summary', 'text', 'lcov'],
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.test.json'
    }
  }
}

export default config
