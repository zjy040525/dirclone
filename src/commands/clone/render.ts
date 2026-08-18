import type { SingleBar } from 'cli-progress'
import type { ChildProcess } from 'node:child_process'

export function updateProgress(progress: SingleBar, output: string): void {
  const progressPattern = /(?:remote:\s*)?(Counting objects|Compressing objects|Receiving objects|Resolving deltas):\s*(\d{1,3})%/g

  for (const match of output.matchAll(progressPattern)) {
    const [, stage, percentage] = match
    if (stage && percentage) {
      progress.update(Math.min(Number(percentage), 100), { stage })
    }
  }
}

export function waitForExit(child: ChildProcess): Promise<number | null> {
  return new Promise((resolve, reject) => {
    child.once('error', reject)
    child.once('close', resolve)
  })
}

export function getGitError(output: string): string | undefined {
  const lines = output
    .split(/[\r\n]+/)
    .map(line => line.trim())
    .filter(Boolean)

  return [...lines].reverse().find(line => /\b(?:error|fatal):/i.test(line)) || lines.at(-1)
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
