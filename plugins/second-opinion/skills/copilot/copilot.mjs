#!/usr/bin/env node
// GitHub Copilot CLIの読み取り専用呼び出し。
//
// Copilotをview/rg/globのみに隔離する: ファイル書き込み・shell・ネットワーク・
// git/ghは使わせない。組み込みMCPは無効化する。
//
// 使い方: node copilot.mjs --prompt-file <path> [options]
// 終了コード: 0 成功、2 プロンプトにシークレット検出、64 使い方エラー、
// 66 ファイル無し、69 copilot CLI無し。

import { spawnSync } from 'node:child_process'
import { accessSync, constants, existsSync, readFileSync } from 'node:fs'
import { delimiter, join } from 'node:path'
import { findSecretPattern } from '../../scripts/lib/secret-patterns.mjs'

const DEFAULT_MODEL = 'gpt-5.4'
const DEFAULT_EFFORT = 'medium'

function usage() {
  return `Usage: node copilot.mjs --prompt-file <path> [options]

Required:
  --prompt-file <path>     File containing the English prompt body.

Optional:
  --cwd <dir>              Run Copilot in <dir>. Absolute path.
  --model <id>             Override the default model (${DEFAULT_MODEL}).
  --effort <level>         Override the default reasoning effort (${DEFAULT_EFFORT}).
                            Choices: none, low, medium, high, xhigh, max.

Mode: read-only. Available tools: view, rg, glob. No file writes, no shell,
no network, no git/gh access.
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

if (!commandExists('copilot')) {
  console.error('Error: copilot CLI not found on PATH')
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

const copilotArgs = [
  '-p', promptText,
  '--allow-all-tools',
  '--no-ask-user',
  '--disable-builtin-mcps',
  '--available-tools=view,rg,glob',
  '-s',
]

if (cwd) copilotArgs.push('-C', cwd)
if (model) copilotArgs.push('--model', model)
if (effort) copilotArgs.push('--reasoning-effort', effort)

const result = spawnSync('copilot', copilotArgs, { stdio: 'inherit' })
process.exit(result.status ?? 1)
