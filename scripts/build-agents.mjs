#!/usr/bin/env node
// agents-src/*.md の本文を plugins/code-review/agents/*.md の生成済みsubagent定義に合成する。
// 情報源は agents-src/ — plugins/code-review/agents/*.md を手で編集しない。

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

process.chdir(join(dirname(fileURLToPath(import.meta.url)), '..'))

mkdirSync('plugins/code-review/agents', { recursive: true })

function writeAgent(name, model, description, bodyFile) {
  const out = `plugins/code-review/agents/${name}.md`
  const header = ['---', `name: ${name}`, `description: ${description}`, `model: ${model}`, 'tools: Read, Grep, Glob', '---'].join('\n')
  const generated = ['<!-- GENERATED FILE — do not edit directly.', `     Source: agents-src/${bodyFile}, composed by scripts/build-agents.mjs. -->`].join('\n')
  const body = readFileSync(`agents-src/${bodyFile}`, 'utf8')
  writeFileSync(out, `${header}\n\n${generated}\n\n${body}`)
  console.log(`wrote ${out}`)
}

writeAgent(
  'code-reviewer-sonnet',
  'sonnet',
  'Fast, low-latency diff reviewer for frequent use (e.g. before each commit). Invoked by review skills, not typically triggered directly by user phrasing.',
  'code-reviewer-body.md',
)

writeAgent(
  'code-reviewer-opus',
  'opus',
  'Thorough diff reviewer for high-stakes, low-frequency checks (e.g. before merge, when no human reviews the PR afterward). Invoked by review skills, not typically triggered directly by user phrasing.',
  'code-reviewer-body.md',
)
