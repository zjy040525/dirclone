import { mkdtemp, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { clone } from '../src/commands/clone'
import { resolveGitDirectory } from '../src/commands/clone/resolveGitDirectory'

const repositoryUrl = 'https://github.com/zjy040525/dirclone.git'

describe('clone integration', () => {
  it('clones the public dirclone repository', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'dirclone-integration-'))

    try {
      await expect(clone({ root, url: repositoryUrl })).resolves.toBe(0)
      await expect(stat(path.join(root, resolveGitDirectory(repositoryUrl), '.git'))).resolves.toBeDefined()
    }
    finally {
      await rm(root, { force: true, recursive: true })
    }
  }, 30_000)
})
