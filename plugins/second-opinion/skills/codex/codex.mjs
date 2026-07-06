#!/usr/bin/env node
// OpenAI Codex CLIの読み取り専用呼び出し。
//
// Codexをread-onlyサンドボックスで実行する: ファイル書き込み・ネットワークを
// 禁止し、承認プロンプトは要求しない(非対話的に失敗させる)。
//
// 使い方: node codex.mjs --prompt-file <path> [options]
// 終了コード: 0 成功、2 プロンプトにシークレット検出、64 使い方エラー、
// 66 ファイル無し、69 codex CLI無し。

import { spawnSync } from 'node:child_process'
import { accessSync, constants, existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'
import { findSecretPattern } from '../../scripts/lib/secret-patterns.mjs'

const DEFAULT_MODEL = 'gpt-5.4'
const DEFAULT_EFFORT = 'medium'

function usage() {
  return `Usage: node codex.mjs --prompt-file <path> [options]

Required:
  --prompt-file <path>     File containing the English prompt body.

Optional:
  --cwd <dir>              Run Codex in <dir>. Absolute path.
  --model <id>             Override the default model (${DEFAULT_MODEL}).
  --effort <level>         Override the default reasoning effort (${DEFAULT_EFFORT}).

Mode: read-only sandbox. No file writes, network restricted, no approval
prompts (fails instead of asking).
`
}

function commandExists(cmd) {
  const dirs = (process.env.PATH ?? '').split(delimiter)
  const exts = process.platform === 'win32' ? (process.env.PATHEXT ?? '.EXE').split(';') : ['']
  for (const dir of dirs) {
    for (const ext of exts) {
      try {
        accessSync(join(dir, cmd + ext), constants.X_OK)
        return true
      } catch {
        // 次の候補を試す
      }
    }
  }
  return false
}

let promptFile = ''
let cwd = ''
let model = DEFAULT_MODEL
let effort = DEFAULT_EFFORT

const args = process.argv.slice(2)
for (let i = 0; i < args.length; i++) {
  const arg = args[i]
  if (arg === '--prompt-file') {
    promptFile = args[++i]
  } else if (arg === '--cwd') {
    cwd = args[++i]
  } else if (arg === '--model') {
    model = args[++i]
  } else if (arg === '--effort') {
    effort = args[++i]
  } else if (arg === '-h' || arg === '--help') {
    console.error(usage())
    process.exit(0)
  } else {
    console.error(`Unknown argument: ${arg}`)
    console.error(usage())
    process.exit(64)
  }
}

if (!promptFile) {
  console.error('Error: --prompt-file is required')
  process.exit(64)
}

if (!existsSync(promptFile)) {
  console.error(`Error: prompt file not found: ${promptFile}`)
  process.exit(66)
}

if (!commandExists('codex')) {
  console.error('Error: codex CLI not found on PATH')
  process.exit(69)
}

// 多層防御のシークレットスキャン。プロンプトファイルはClaudeが書き込み前に
// redactしている想定だが、見落としを拾う。
const promptText = readFileSync(promptFile, 'utf8')
const hit = findSecretPattern(promptText)
if (hit) {
  console.error(`Error: ${promptFile} appears to contain a secret.`)
  console.error(`Pattern matched: ${hit.source.slice(0, 60)}...`)
  console.error('Redact the value before proceeding.')
  process.exit(2)
}

const outDir = mkdtempSync(join(tmpdir(), 'codex-out-'))
const outFile = join(outDir, 'last-message.txt')

const codexArgs = [
  'exec',
  '-s', 'read-only',
  '--skip-git-repo-check',
  '-c', `model_reasoning_effort=${effort}`,
  '-o', outFile,
]

if (cwd) codexArgs.push('-C', cwd)
if (model) codexArgs.push('-m', model)
codexArgs.push('-')

const result = spawnSync('codex', codexArgs, {
  input: promptText,
  stdio: ['pipe', 'ignore', 'inherit'],
})

if (existsSync(outFile)) {
  console.log(readFileSync(outFile, 'utf8'))
} else {
  console.error('Error: Codex produced no output (see stderr above).')
}

try {
  rmSync(outDir, { recursive: true, force: true })
} catch {
  // ベストエフォート。失敗しても致命的ではない。
}

process.exit(result.status ?? 1)
