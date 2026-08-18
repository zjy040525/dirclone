import type { Config } from 'ts-json-schema-generator'
import { createGenerator } from 'ts-json-schema-generator'

const config: Config = {
  path: 'src/types.ts',
  type: 'SchemaOptions',
  topRef: false,
}

const schema = createGenerator(config).createSchema(config.type)

export const schemaString = JSON.stringify(schema, null, 2)
