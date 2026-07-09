#!/usr/bin/env node
// ai-smell-audit skill用。tracked *.md のうち、人間読者向けの散文文書(記事・README・
// レポート等)のパスを列挙する。Claude Code の指示ファイル(SKILL.md/CLAUDE.md/
// AGENTS.md、.claude/skills//agents//rules/ 配下、および本リポジトリのplugin
// 開発レイアウトplugins/<name>/skills//agents/ 配下)は対象外 — 意図的に簡潔・
// 箇条書き中心であり、この監査の前提(散文の書き手性・リズム)が成立しない。
// skills/agents/rulesという名前のディレクトリ自体はこの用途と無関係に存在し
// うるため、.claude/配下かplugins/<name>/配下のいずれかに限定してマッチさせる。

import { execFileSync } from 'node:child_process'
import { existsSync, statSync } from 'node:fs'

const EXCLUDE_RE = /(^|\/)(node_modules|vendor|dist|build|out|\.next|target|__pycache__|\.venv|venv|coverage)\//
const INSTRUCTION_DOC_RE = /(^|\/)\.claude\/(skills|agents|rules)\/|(^|\/)plugins\/[^/]+\/(skills|agents)\/|(^|\/)(SKILL|CLAUDE|AGENTS)\.md$/i
const MD_RE = /\.md$/i

const pathPrefixes = process.argv.slice(2)

const files = execFileSync('git', ['ls-files'], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 1024 })
  .split('\n')
  .filter(Boolean)
  .filter((f) => MD_RE.test(f) && !EXCLUDE_RE.test(f) && !INSTRUCTION_DOC_RE.test(f))
  .filter((f) => existsSync(f) && statSync(f).isFile())
  .filter((f) => pathPrefixes.length === 0 || pathPrefixes.some((p) => f.startsWith(p)))

for (const f of files) console.log(f)
