import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { ESLint } from 'eslint'
import { schemaString } from '#dirclone'

const outputPath = path.resolve(process.cwd(), 'schema.json')

const eslint = new ESLint({ fix: true })

const [result] = await eslint.lintText(schemaString, { filePath: outputPath })

const fixedSchema = result.output || result.source

if (!fixedSchema) {
  throw new Error('Failed to format schema')
}

await fs.writeFile(outputPath, fixedSchema)
