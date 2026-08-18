import type { Buffer } from 'node:buffer'
import { spawn } from 'node:child_process'
import { chmod, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'

interface CliResult {
  exitCode: number | null
  stderr: string
  stdout: string
}

interface RunCliOptions {
  cwd?: string
  env?: NodeJS.ProcessEnv
}

const projectRoot = fileURLToPath(new URL('..', import.meta.url))
const tsxCliPath = path.join(projectRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs')
const cliPath = path.join(projectRoot, 'src', 'cli.ts')
const temporaryDirectories: string[] = []
const rootConfigFixture = new URL('./fixtures/config/root.json', import.meta.url)

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(directory => rm(directory, { force: true, recursive: true })))
})

async function createTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), 'dirclone-cli-'))
  temporaryDirectories.push(directory)
  return directory
}

async function createFakeGit(binDirectory: string): Promise<void> {
  const gitPath = path.join(binDirectory, 'git')

  await mkdir(binDirectory)
  await writeFile(gitPath, [
    '#!/bin/sh',
    'printf "%s\\n" "$@" > "$(dirname "$0")/arguments"',
    'mkdir -p "$4"',
  ].join('\n'))
  await chmod(gitPath, 0o755)
}

function runCli(args: string[], options: RunCliOptions = {}): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [tsxCliPath, cliPath, ...args], {
      cwd: options.cwd || projectRoot,
      env: options.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''

    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString()
    })
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })
    child.once('error', reject)
    child.once('close', exitCode => resolve({ exitCode, stderr, stdout }))
  })
}

describe('cli', () => {
  it('shows the command and root option in help output', async () => {
    const result = await runCli(['--help'])

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('Clone a repository from a Git URL')
    expect(result.stdout).toContain('--root <root>')
  })

  it('exits with an error when the Git repository URL is missing', async () => {
    const result = await runCli([])

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('A Git repository URL is required.')
  })

  it('uses the configured root when --root is omitted', async () => {
    const cwd = await createTemporaryDirectory()
    const binDirectory = path.join(cwd, 'bin')
    const url = 'https://github.com/acme/widgets.git'
    const destination = path.join(cwd, '.sd', 'github.com', 'acme', 'widgets')

    await writeFile(path.join(cwd, '.dirclonerc.json'), await readFile(rootConfigFixture, 'utf8'))
    await createFakeGit(binDirectory)

    const result = await runCli([url], {
      cwd,
      env: {
        ...process.env,
        PATH: `${binDirectory}${path.delimiter}${process.env.PATH || ''}`,
      },
    })

    expect(result.exitCode).toBe(0)
    await expect(stat(destination)).resolves.toBeDefined()
    await expect(readFile(path.join(binDirectory, 'arguments'), 'utf8')).resolves.toBe([
      'clone',
      '--progress',
      url,
      destination,
      '',
    ].join('\n'))
  })
})
