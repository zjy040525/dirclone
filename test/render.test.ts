import type { SingleBar } from 'cli-progress'
import type { ChildProcess } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { getErrorMessage, getGitError, updateProgress, waitForExit } from '../src/commands/clone/render'

interface ProgressUpdate {
  stage: string
  value: number
}

const fatalErrorFixture = new URL('./fixtures/git-output/fatal-error.txt', import.meta.url)
const progressFixture = new URL('./fixtures/git-output/progress.txt', import.meta.url)

function createProgressRecorder(): { progress: SingleBar, updates: ProgressUpdate[] } {
  const updates: ProgressUpdate[] = []
  const progress = {
    update(value: number, payload?: { stage?: string }) {
      updates.push({ stage: payload?.stage || '', value })
    },
  } as SingleBar

  return { progress, updates }
}

describe('updateProgress', () => {
  it('records Git progress stages and clamps percentages to 100', async () => {
    const { progress, updates } = createProgressRecorder()

    updateProgress(progress, await readFile(progressFixture, 'utf8'))

    expect(updates).toEqual([
      { stage: 'Counting objects', value: 25 },
      { stage: 'Compressing objects', value: 50 },
      { stage: 'Receiving objects', value: 100 },
      { stage: 'Resolving deltas', value: 100 },
    ])
  })

  it('ignores non-progress output', () => {
    const { progress, updates } = createProgressRecorder()

    updateProgress(progress, 'remote: Enumerating objects: 42%')

    expect(updates).toEqual([])
  })
})

describe('getGitError', () => {
  it('prefers the final fatal or error line', async () => {
    expect(getGitError(await readFile(fatalErrorFixture, 'utf8'))).toBe('fatal: final failure')
  })

  it('falls back to the final non-empty line', () => {
    expect(getGitError('remote: Enumerating objects\nno repository found\n')).toBe('no repository found')
    expect(getGitError('')).toBeUndefined()
  })
})

describe('getErrorMessage', () => {
  it('returns an Error message and stringifies other values', () => {
    expect(getErrorMessage(new Error('Git is unavailable'))).toBe('Git is unavailable')
    expect(getErrorMessage('unknown failure')).toBe('unknown failure')
  })
})

describe('waitForExit', () => {
  it('resolves with the child exit code', async () => {
    const child = new EventEmitter() as ChildProcess
    const result = waitForExit(child)

    child.emit('close', 0)

    await expect(result).resolves.toBe(0)
  })

  it('rejects when the child process emits an error', async () => {
    const child = new EventEmitter() as ChildProcess
    const error = new Error('Git is unavailable')
    const result = waitForExit(child)

    child.emit('error', error)

    await expect(result).rejects.toBe(error)
  })
})
