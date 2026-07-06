#!/usr/bin/env node
// lib/secret-patterns.mjs のCLIラッパー。
//
// 使い方: node check-secrets.mjs <file>
// 終了コード: 0 クリーン、2 シークレット検出、64 使い方エラー、66 ファイル無し。

import { existsSync, readFileSync } from 'node:fs'
import { findSecretPattern } from './lib/secret-patterns.mjs'

const [target] = process.argv.slice(2)

if (!target || process.argv.length !== 3) {
  console.error('Usage: check-secrets.mjs <file>')
  process.exit(64)
}

if (!existsSync(target)) {
  console.error(`Error: file not found: ${target}`)
  process.exit(66)
}

const hit = findSecretPattern(readFileSync(target, 'utf8'))
if (hit) {
  console.error(`Error: ${target} appears to contain a secret.`)
  console.error(`Pattern matched: ${hit.source.slice(0, 60)}...`)
  console.error('Redact the value before proceeding.')
  process.exit(2)
}

process.exit(0)
