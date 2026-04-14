import { execSync } from 'node:child_process'
import path from 'node:path'
import { text } from '@clack/prompts'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { create, parseDir, resolveOptions } from '../src'

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}))

vi.mock('@clack/prompts', () => ({
  cancel: vi.fn(),
  intro: vi.fn(),
  isCancel: vi.fn(val => val === 'cancel'),
  outro: vi.fn(),
  spinner: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
  })),
  text: vi.fn(),
}))

describe('create', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(process, 'cwd').mockReturnValue('/mock/cwd')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should clone repository correctly with provided options', async () => {
    await create('https://github.com/user/repo.git', {
      root: 'my-root',
      output: 'my-output',
    })

    const expectedOutput = path.join('/mock/cwd', 'my-root', 'my-output')
    expect(execSync).toHaveBeenCalledWith(`git clone "https://github.com/user/repo.git" "${expectedOutput}"`, { stdio: 'inherit' })
  })
})

describe('resolveOptions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(process, 'cwd').mockReturnValue('/mock/cwd')
    vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called')
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should resolve full options directly', async () => {
    const options = await resolveOptions({
      url: 'https://github.com/user/repo.git',
      root: 'my-root',
      output: 'my-repo',
    })

    expect(options.url).toBe('https://github.com/user/repo.git')
    expect(options.root).toBe(path.join('/mock/cwd', 'my-root'))
    expect(options.output).toBe(path.join('/mock/cwd', 'my-root', 'my-repo'))
    expect(options.yes).toBe(false)
    expect(text).not.toHaveBeenCalled()
  })

  it('should prompt for missing options', async () => {
    vi.mocked(text)
      .mockResolvedValueOnce('https://github.com/prompted/repo.git') // url prompt
      .mockResolvedValueOnce('./') // root prompt
      .mockResolvedValueOnce('prompted-output') // output prompt

    const options = await resolveOptions({})

    expect(text).toHaveBeenCalledTimes(3)
    expect(options.url).toBe('https://github.com/prompted/repo.git')
    expect(options.root).toBe(path.resolve('/mock/cwd', './'))
    expect(options.output).toBe(path.join(options.root, 'prompted-output'))
    expect(options.yes).toBe(false)
  })

  it('should skip root and output prompts if yes is true', async () => {
    const options = await resolveOptions({
      url: 'https://github.com/user/repo.git',
      yes: true,
    })

    // URL is provided, so it is never prompted.
    // root and output prompt should be skipped due to yes: true
    expect(text).not.toHaveBeenCalled()
    expect(options.yes).toBe(true)
    expect(options.url).toBe('https://github.com/user/repo.git')
    expect(options.root).toBe(path.resolve('/mock/cwd', './'))
    expect(options.output).toBe(path.join(options.root, path.join('github.com', 'user/repo')))
  })

  it('should validate url if provided directly and throw if unsupported', async () => {
    await expect(resolveOptions({ url: 'invalid-url' })).rejects.toThrow('Unsupported Git URL format')
  })
})

describe('parseDir', () => {
  it('should parse http/https urls', () => {
    expect(parseDir('https://github.com/user/repo.git')).toBe(path.join('github.com', 'user/repo'))
    expect(parseDir('http://gitlab.com/user/repo')).toBe(path.join('gitlab.com', 'user/repo'))
  })

  it('should parse ssh urls', () => {
    expect(parseDir('ssh://git@github.com/user/repo.git')).toBe(path.join('github.com', 'user/repo'))
    expect(parseDir('git@github.com:user/repo.git')).toBe(path.join('github.com', 'user/repo'))
    expect(parseDir('git@bitbucket.org:team/repo.git')).toBe(path.join('bitbucket.org', 'team/repo'))
  })

  it('should throw on unsupported urls', () => {
    expect(() => parseDir('unsupported-url')).toThrow('Unsupported Git URL format')
    expect(() => parseDir('/local/path')).toThrow('Unsupported Git URL format')
  })
})
