import { chmod, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { clone } from '../src/commands/clone'
import { resolveGitDirectory } from '../src/commands/clone/resolveGitDirectory'

const temporaryDirectories: string[] = []
const initialPath = process.env.PATH

afterEach(async () => {
  vi.restoreAllMocks()
  if (initialPath === undefined) {
    delete process.env.PATH
  }
  else {
    process.env.PATH = initialPath
  }
  await Promise.all(temporaryDirectories.splice(0).map(directory => rm(directory, { force: true, recursive: true })))
})

async function createTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), 'dirclone-'))
  temporaryDirectories.push(directory)
  return directory
}

async function createFakeGit(binDirectory: string, script: string[]): Promise<void> {
  const fakeGitPath = path.join(binDirectory, 'git')

  await mkdir(binDirectory)
  await writeFile(fakeGitPath, script.join('\n'))
  await chmod(fakeGitPath, 0o755)
  process.env.PATH = `${binDirectory}${path.delimiter}${initialPath || ''}`
}

describe('resolveGitDirectory', () => {
  it('maps supported Git URL forms to a relative directory', () => {
    expect(resolveGitDirectory('https://github.com/acme/widgets.git')).toBe(path.join('github.com', 'acme', 'widgets'))
    expect(resolveGitDirectory('ssh://git@github.com/acme/widgets.git')).toBe(path.join('github.com', 'acme', 'widgets'))
    expect(resolveGitDirectory('git@github.com:acme/widgets.git')).toBe(path.join('github.com', 'acme', 'widgets'))
    expect(resolveGitDirectory('git://github.com/acme/widgets.git')).toBe(path.join('github.com', 'acme', 'widgets'))
    expect(resolveGitDirectory(' https://github.com/acme/widgets.git/ ')).toBe(path.join('github.com', 'acme', 'widgets'))
  })

  it('rejects unsupported URLs and paths that could escape the clone root', () => {
    for (const url of [
      'file:///tmp/widgets.git',
      'https://github.com',
      'git@github.com:../widgets.git',
      'git@github.com:acme\\widgets.git',
      'not-a-git-url',
    ]) {
      expect(() => resolveGitDirectory(url)).toThrow('Unsupported Git repository URL.')
    }
  })
})

describe('clone', () => {
  it('returns 1 when the Git repository URL is missing', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(clone({})).resolves.toBe(1)
    await expect(clone({ url: '   ' })).resolves.toBe(1)

    expect(error).toHaveBeenCalledWith(expect.stringContaining('A Git repository URL is required.'))
  })

  it('runs git with progress enabled in the requested working directory', async () => {
    const temporaryDirectory = await createTemporaryDirectory()
    const cwd = path.join(temporaryDirectory, 'working-directory')

    const binDirectory = path.join(temporaryDirectory, 'bin')
    const root = 'clones'
    const url = 'https://github.com/acme/widgets.git'
    const destination = path.join(cwd, root, 'github.com', 'acme', 'widgets')

    await mkdir(cwd)
    await createFakeGit(
      binDirectory,
      [
        '#!/bin/sh',
        'printf "%s\\n" "$PWD" > "$(dirname "$0")/cwd"',
        'printf "%s\\n" "$@" > "$(dirname "$0")/arguments"',
        'printf "Receiving objects: 100%%\\r" >&2',
        'mkdir -p "$4"',
      ],
    )

    await expect(clone({ cwd, root, url })).resolves.toBe(0)
    await expect(stat(destination)).resolves.toBeDefined()
    await expect(readFile(path.join(binDirectory, 'cwd'), 'utf8')).resolves.toBe(`${cwd}\n`)
    await expect(readFile(path.join(binDirectory, 'arguments'), 'utf8')).resolves.toBe([
      'clone',
      '--progress',
      url,
      destination,
      '',
    ].join('\n'))
  })

  it('returns 1 and reports Git diagnostics when cloning fails', async () => {
    const temporaryDirectory = await createTemporaryDirectory()
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    await createFakeGit(path.join(temporaryDirectory, 'bin'), [
      '#!/bin/sh',
      'printf "fatal: repository not found\\n" >&2',
      'exit 128',
    ])

    await expect(clone({
      root: path.join(temporaryDirectory, 'clones'),
      url: 'https://github.com/acme/widgets.git',
    })).resolves.toBe(1)

    expect(error).toHaveBeenCalledWith(expect.stringContaining('fatal: repository not found'))
  })

  it('returns 1 when Git is unavailable', async () => {
    const temporaryDirectory = await createTemporaryDirectory()
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const emptyBinDirectory = path.join(temporaryDirectory, 'empty-bin')

    await mkdir(emptyBinDirectory)
    process.env.PATH = emptyBinDirectory

    await expect(clone({
      root: path.join(temporaryDirectory, 'clones'),
      url: 'https://github.com/acme/widgets.git',
    })).resolves.toBe(1)

    expect(error).toHaveBeenCalledWith(expect.stringContaining('Unable to run git clone:'))
  })

  it('returns 1 when it cannot create the clone directory', async () => {
    const temporaryDirectory = await createTemporaryDirectory()
    const root = path.join(temporaryDirectory, 'not-a-directory')
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    await writeFile(root, '')

    await expect(clone({ root, url: 'https://github.com/acme/widgets.git' })).resolves.toBe(1)

    expect(error).toHaveBeenCalledWith(expect.stringContaining('Unable to prepare clone directory:'))
  })
})
