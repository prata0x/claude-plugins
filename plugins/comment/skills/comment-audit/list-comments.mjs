#!/usr/bin/env node
// comment-audit skill用。tracked fileのうちコメントマーカーを持つ拡張子から、
// 全コメント行を`file:line: text`形式で列挙する。ai-comment-check.mjsと違い
// violation判定はしない — 判定は呼び出し側のsub-agentが行う。

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, statSync } from 'node:fs'

const EXCLUDE_RE = /(^|\/)(node_modules|vendor|dist|build|out|\.next|target|__pycache__|\.venv|venv|coverage)\//

const COMMENT_MARKERS = {
  '.ts': '//', '.tsx': '//', '.js': '//', '.jsx': '//', '.mjs': '//', '.cjs': '//', '.cs': '//',
  '.py': '#', '.sh': '#', '.bash': '#', '.ps1': '#', '.psm1': '#',
  '.css': '/*', '.html': '<!--', '.htm': '<!--',
}
const EXT_RE = new RegExp(`(${Object.keys(COMMENT_MARKERS).map((e) => e.replace('.', '\\.')).join('|')})$`, 'i')

function markerFor(filePath) {
  const m = filePath.match(/\.[^./]+$/)
  return m ? COMMENT_MARKERS[m[0].toLowerCase()] : undefined
}

const MAX_BUFFER = 1024 * 1024 * 1024
const pathPrefixes = process.argv.slice(2)

const files = execFileSync('git', ['ls-files'], { encoding: 'utf8', maxBuffer: MAX_BUFFER })
  .split('\n')
  .filter(Boolean)
  .filter((f) => EXT_RE.test(f) && !EXCLUDE_RE.test(f) && existsSync(f) && statSync(f).isFile())
  .filter((f) => pathPrefixes.length === 0 || pathPrefixes.some((p) => f.startsWith(p)))

for (const f of files) {
  const marker = markerFor(f)
  readFileSync(f, 'utf8')
    .split('\n')
    .forEach((text, i) => {
      const idx = text.indexOf(marker)
      if (idx === -1) return
      if (text[idx - 1] === ':') return // http://等のURLリテラルを除外
      console.log(`${f}:${i + 1}: ${text.trim()}`)
    })
}
