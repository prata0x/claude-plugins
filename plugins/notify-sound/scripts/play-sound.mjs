#!/usr/bin/env node
// WSLからpowershell.exe経由でWindowsのシステムサウンドを鳴らす。
// hookのデフォルトシェルはUnixはbash、Windows単体ではpowershellと環境依存のため、
// Claude Code本体が依存するNodeを直接呼ぶことでシェル差異の影響を避けている。

import { execFileSync } from 'node:child_process'

const SOUNDS = {
  question: String.raw`C:\Windows\Media\Windows Notify Messaging.wav`,
  done: String.raw`C:\Windows\Media\tada.wav`,
}

const kind = process.argv[2] ?? 'done'
const wav = SOUNDS[kind] ?? SOUNDS.done

try {
  execFileSync(
    'powershell.exe',
    ['-NoProfile', '-Command', `(New-Object Media.SoundPlayer '${wav}').PlaySync()`],
    { stdio: 'ignore' }
  )
} catch {
  // powershell.exe not reachable (non-WSL/Windows environment) — no-op
}
