#!/usr/bin/env node
// WSLからpowershell.exe経由でWindowsのシステムサウンドを鳴らす。
// hookのデフォルトシェルはUnixはbash、Windows単体ではpowershellと環境依存のため、
// Claude Code本体が依存するNodeを直接呼ぶことでシェル差異の影響を避けている。

import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const SOUNDS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'sounds')

const DEFAULT_SOUNDS = {
  question: path.join(SOUNDS_DIR, 'question.wav'),
  done: path.join(SOUNDS_DIR, 'done.wav'),
}

const ENV_OVERRIDES = {
  question: 'NOTIFY_SOUND_QUESTION',
  done: 'NOTIFY_SOUND_DONE',
}

const kind = process.argv[2] ?? 'done'
const envVar = ENV_OVERRIDES[kind] ?? ENV_OVERRIDES.done
const soundPath = process.env[envVar] || DEFAULT_SOUNDS[kind] || DEFAULT_SOUNDS.done

// System.Media.SoundPlayer only resolves Windows-style paths, so a WSL path
// needs the wslpath conversion; a path the user already gave in Windows form
// (via the env override) is passed through as-is.
function toWindowsPath(p) {
  if (/^[a-zA-Z]:\\/.test(p)) return p
  try {
    return execFileSync('wslpath', ['-w', p], { encoding: 'utf8' }).trim()
  } catch {
    return p
  }
}

try {
  const winPath = toWindowsPath(soundPath).replace(/'/g, "''")
  execFileSync(
    'powershell.exe',
    ['-NoProfile', '-Command', `(New-Object Media.SoundPlayer '${winPath}').PlaySync()`],
    { stdio: 'ignore' }
  )
} catch {
  // powershell.exe not reachable (non-WSL/Windows environment) — no-op
}
