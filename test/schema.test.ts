import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { schemaString } from '../src/schema'

describe('schemaString', () => {
  it('matches the generated schema snapshot', () => {
    const schema = JSON.parse(schemaString)

    expect(schema).toMatchObject({
      $schema: 'http://json-schema.org/draft-07/schema#',
      additionalProperties: false,
      type: 'object',
    })
    expect(schema).not.toHaveProperty('required')
    expect(schema).toMatchSnapshot()
  })

  it('matches the checked-in schema file', async () => {
    const schemaFile = await readFile(new URL('../schema.json', import.meta.url), 'utf8')

    expect(JSON.parse(schemaFile)).toEqual(JSON.parse(schemaString))
  })
})
