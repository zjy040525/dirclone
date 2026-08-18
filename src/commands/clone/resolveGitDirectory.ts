import path from 'node:path'

export function resolveGitDirectory(url: string): string {
  const trimmedUrl = url.trim()
  let host: string | undefined
  let pathname: string | undefined
  const scheme = /^([a-z][a-z\d+.-]*):\/\//i.exec(trimmedUrl)?.[1]?.toLowerCase()

  if (scheme) {
    if (!['http', 'https', 'ssh', 'git'].includes(scheme)) {
      throw new Error('Unsupported Git repository URL.')
    }

    try {
      const parsed = new URL(trimmedUrl)
      host = parsed.hostname
      pathname = parsed.pathname
    }
    catch {
      throw new Error('Unsupported Git repository URL.')
    }
  }
  else {
    const scpUrl = /^(?:[^@\s:]+@)?([^:\s/]+):(.+)$/.exec(trimmedUrl)
    host = scpUrl?.[1]
    pathname = scpUrl?.[2]
  }

  const segments = pathname
    ?.replace(/^\/+|\/+$/g, '')
    .replace(/\.git$/i, '')
    .split('/')

  if (
    !host
    || !segments?.length
    || host === '.'
    || host === '..'
    || host.includes('/')
    || host.includes('\\')
    || segments.some(segment => !segment || segment === '.' || segment === '..' || segment.includes('\\'))
  ) {
    throw new Error('Unsupported Git repository URL.')
  }

  return path.join(host, ...segments)
}
