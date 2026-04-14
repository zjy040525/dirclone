import { execSync } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import { cancel, intro, isCancel, outro, spinner, text } from '@clack/prompts'

export interface Options {
  root?: string
  output?: string
  yes?: boolean
  url?: string
}

export type ResolvedOptions = Required<Options>

export async function create(
  url: string | undefined,
  options: Options,
): Promise<void> {
  intro('Cloning a git repository...')

  const resolved = await resolveOptions({ ...options, url })

  const s = spinner()
  s.start('Cloning the repository...')

  execSync(`git clone "${resolved.url}" "${resolved.output}"`, { stdio: 'inherit' })

  s.stop('Repository cloned')

  outro('Done!')
}

export async function resolveOptions(options: Options): Promise<ResolvedOptions> {
  let url: Options['url'] | symbol = options.url

  if (!url) {
    url = await text({
      message: 'Please enter the git repository url:',
      validate(value) {
        if (!value) {
          return 'URL is required'
        }
        try {
          parseDir(value)
        }
        catch (err) {
          return String(err)
        }
      },
    })
    if (isCancel(url)) {
      cancel('Operation cancelled.')
      process.exit(1)
    }
  }
  else {
    // validate
    parseDir(url)
  }

  const yes: Options['yes'] = options.yes ?? false

  let root: Options['root'] | symbol = options.root

  if (!root) {
    const defaultRoot = './'
    root = yes
      ? defaultRoot
      : await text({
          message: 'Please enter the root directory to clone into (default: ./):',
          defaultValue: defaultRoot,
          placeholder: 'current directory',
        })
    if (isCancel(root)) {
      cancel('Operation cancelled.')
      process.exit(1)
    }
  }
  root = path.resolve(process.cwd(), root)

  let output: Options['output'] | symbol = options.output

  if (!output) {
    const defaultDir = parseDir(url)
    output = yes
      ? defaultDir
      : await text({
          message: 'Please enter the output directory for the cloned repository (default: derived from the url):',
          defaultValue: defaultDir,
          placeholder: 'derived from the url',
        })
    if (isCancel(output)) {
      cancel('Operation cancelled.')
      process.exit(1)
    }
  }
  output = path.join(root, output)

  return {
    yes,
    output,
    root,
    url,
  }
}

export function parseDir(url: string): string {
  let host = ''
  let pathname = ''
  url = url.replace(/\.git$/, '')

  if (url.startsWith('http://') || url.startsWith('https://')) {
    const parsed = new URL(url)
    host = parsed.hostname
    pathname = parsed.pathname.replace(/^\//, '')
  }
  else if (url.startsWith('ssh://')) {
    const parsed = new URL(url)
    host = parsed.hostname
    pathname = parsed.pathname.replace(/^\//, '')
  }
  else if (url.includes('@')) {
    const parts = url.split(':')
    if (parts.length >= 2) {
      const userHost = parts[0]
      host = userHost.split('@')[1] || userHost
      pathname = parts.slice(1).join(':').replace(/^\//, '')
    }
  }
  else {
    throw new Error('Unsupported Git URL format')
  }

  return path.join(host, pathname)
}
