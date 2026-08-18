import type { CliOptions } from './config'
import process from 'node:process'
import { cac } from 'cac'
import restoreCursor from 'restore-cursor'
import pkgJson from '../package.json'
import { clone } from './commands/clone'
import { resolveConfig } from './config'

const cli = cac('dirclone')

cli
  .command('[url]', 'Clone a repository from a Git URL')
  .option('-r, --root <root>', 'Clone repositories under this directory')
  .action(async (url: string, options: CliOptions) => {
    options.url = url

    const resolved = await resolveConfig(options)

    const exitCode = await clone(resolved)

    process.exit(exitCode)
  })

cli.help()
cli.version(pkgJson.version)

cli.parse()

restoreCursor()
