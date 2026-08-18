import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { resolveConfig } from '../src/config'

const temporaryDirectories: string[] = []
const rootConfigFixture = new URL('./fixtures/config/root.json', import.meta.url)

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(directory => rm(directory, { force: true, recursive: true })))
})

async function createTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), 'dirclone-config-'))
  temporaryDirectories.push(directory)
  return directory
}

async function writeRootConfig(cwd: string): Promise<void> {
  await writeFile(path.join(cwd, '.dirclonerc.json'), await readFile(rootConfigFixture, 'utf8'))
}

describe('resolveConfig', () => {
  it('loads configuration from the requested working directory', async () => {
    const cwd = await createTemporaryDirectory()

    await writeRootConfig(cwd)

    await expect(resolveConfig({
      cwd,
      url: 'https://github.com/acme/widgets.git',
    })).resolves.toEqual({
      cwd,
      root: './.sd',
      url: 'https://github.com/acme/widgets.git',
    })
  })

  it('lets explicit CLI options override file configuration', async () => {
    const cwd = await createTemporaryDirectory()

    await writeRootConfig(cwd)

    await expect(resolveConfig({
      cwd,
      root: 'command-line-clones',
      url: 'https://github.com/acme/widgets.git',
    })).resolves.toEqual({
      cwd,
      root: 'command-line-clones',
      url: 'https://github.com/acme/widgets.git',
    })
  })

  it('uses the supplied options when no configuration file exists', async () => {
    const cwd = await createTemporaryDirectory()

    await expect(resolveConfig({
      cwd,
      root: 'command-line-clones',
      url: 'https://github.com/acme/widgets.git',
    })).resolves.toEqual({
      cwd,
      root: 'command-line-clones',
      url: 'https://github.com/acme/widgets.git',
    })
  })
})
