import type { Options } from './index.ts'
import process from 'node:process'
import { log } from '@clack/prompts'
import { cac } from 'cac'
import pkg from '../package.json' with { type: 'json' }
import { create } from './index.ts'

const cli = cac(pkg.name).version(pkg.version).help()

cli
  .command('[url]', 'Clone a git repository')
  .option(
    '-r, --root <path>',
    'Root directory to clone into (default: ./)',
  )
  .option(
    '-o, --output <path>',
    'Output directory for the cloned repository (default: derived from the url)',
  )
  .option(
    '-y, --yes',
    'Skip all prompts and use default values',
  )
  .action((url: string | undefined, options: Options) => create(url, options))

export async function runCLI(): Promise<void> {
  cli.parse(process.argv, { run: false })

  try {
    await cli.runMatchedCommand()
  }
  catch (error) {
    log.error(String(error))
    process.exit(1)
  }
}
