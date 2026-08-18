import type { CommonOptions } from './types'
import process from 'node:process'
import deepmerge from 'deepmerge'
import { createConfigLoader } from 'unconfig'

export interface CliOptions extends CommonOptions {
  url?: string
}

export async function resolveConfig(options: CliOptions): Promise<CommonOptions> {
  const loader = createConfigLoader<CommonOptions>({
    sources: [
      {
        files: ['.dirclonerc'],
        extensions: ['json'],
      },
    ],
    cwd: options.cwd || process.cwd(),
    merge: false,
  })

  const config = await loader.load()

  const merged = deepmerge(deepmerge({}, config.config || {}), options)

  return merged
}
