import type { Buffer } from 'node:buffer'
import type { CliOptions } from '../../config'
import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import ansis from 'ansis'
import { SingleBar } from 'cli-progress'
import { getErrorMessage, getGitError, updateProgress, waitForExit } from './render'
import { resolveGitDirectory } from './resolveGitDirectory'

export async function clone(options: CliOptions): Promise<0 | 1> {
  const url = options.url?.trim()

  if (!url) {
    console.error(ansis.red('A Git repository URL is required.'))
    return 1
  }

  let destination: string
  let cwd: string

  try {
    cwd = path.resolve(options.cwd || process.cwd())
    const root = path.resolve(cwd, options.root || '.')
    destination = path.join(root, resolveGitDirectory(url))
    await mkdir(path.dirname(destination), { recursive: true })
  }
  catch (error) {
    console.error(ansis.red(`Unable to prepare clone directory: ${getErrorMessage(error)}`))
    return 1
  }

  process.stdout.write(
    `${ansis.cyan('Cloning')} ${ansis.yellow(url)} ${ansis.dim('to')} ${ansis.green(destination)}\n`,
  )

  const progress = new SingleBar({
    format: `${ansis.cyan('{stage}')} ${ansis.dim('[')}{bar}${ansis.dim(']')} ${ansis.bold('{percentage}%')}`,
    barsize: 24,
    barCompleteChar: '=',
    barIncompleteChar: '-',
    clearOnComplete: true,
    hideCursor: true,
    noTTYOutput: !process.stderr.isTTY,
    stream: process.stderr,
  })
  let gitOutput = ''

  progress.start(100, 0, { stage: 'Cloning' })

  try {
    const child = spawn('git', ['clone', '--progress', url, destination], {
      cwd,
      stdio: ['inherit', 'ignore', 'pipe'],
    })

    child.stderr?.on('data', (chunk: Buffer) => {
      const output = chunk.toString()
      gitOutput = (gitOutput + output).slice(-8_192)
      updateProgress(progress, output)
    })

    const exitCode = await waitForExit(child)

    if (exitCode !== 0) {
      console.error(ansis.red(`Clone failed: ${getGitError(gitOutput) || `git exited with status ${exitCode ?? 1}.`}`))
      return 1
    }

    progress.update(100, { stage: 'Complete' })
    progress.stop()
    process.stdout.write(`${ansis.green(`Clone complete: ${destination}`)}\n`)
    return 0
  }
  catch (error) {
    console.error(ansis.red(`Unable to run git clone: ${getErrorMessage(error)}`))
    return 1
  }
  finally {
    if (progress.isActive) {
      progress.stop()
    }
  }
}
