#!/usr/bin/env node
// 複数pluginで共有される資材だけを複製する。skillsと単一plugin専用のagentは
// plugins/<name>/ 配下で直接編集する — 生成物ではない。
//
// 情報源: scripts/check-secrets.mjs + scripts/lib/ → plugins/handoff, plugins/second-opinion
// 情報源: scripts/security-pattern-check.mjs + scripts/lib/ → plugins/security

import { cpSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

process.chdir(join(dirname(fileURLToPath(import.meta.url)), '..'))

const SHARED_SCRIPTS = {
  'check-secrets.mjs': ['handoff', 'second-opinion'],
  'security-pattern-check.mjs': ['security'],
  lib: ['handoff', 'second-opinion', 'security'],
}

for (const [item, plugins] of Object.entries(SHARED_SCRIPTS)) {
  for (const plugin of plugins) {
    mkdirSync(`plugins/${plugin}/scripts`, { recursive: true })
    cpSync(`scripts/${item}`, `plugins/${plugin}/scripts/${item}`, { recursive: true })
  }
}

console.log('synced shared scripts across plugins')
