#!/usr/bin/env node
// agents-src/*.md の本文を、複数pluginの生成済みsubagent定義に合成する。
// 情報源は agents-src/ — 生成先の plugins/*/agents/*.md を手で編集しない。

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

process.chdir(join(dirname(fileURLToPath(import.meta.url)), '..'))

function writeAgent(outDir, name, model, description, tools, bodyFile) {
  mkdirSync(outDir, { recursive: true })
  const out = `${outDir}/${name}.md`
  const header = ['---', `name: ${name}`, `description: ${description}`, `model: ${model}`, `tools: ${tools}`, '---'].join('\n')
  const generated = ['<!-- GENERATED FILE — do not edit directly.', `     Source: agents-src/${bodyFile}, composed by scripts/build-agents.mjs. -->`].join('\n')
  const body = readFileSync(`agents-src/${bodyFile}`, 'utf8')
  writeFileSync(out, `${header}\n\n${generated}\n\n${body}`)
  console.log(`wrote ${out}`)
}

writeAgent(
  'plugins/code-review/agents',
  'code-reviewer-sonnet',
  'sonnet',
  'Fast, low-latency diff reviewer for frequent use (e.g. before each commit). Invoked by review skills, not typically triggered directly by user phrasing.',
  'Read, Grep, Glob',
  'code-reviewer-body.md',
)

writeAgent(
  'plugins/code-review/agents',
  'code-reviewer-opus',
  'opus',
  'Thorough diff reviewer for high-stakes, low-frequency checks (e.g. before merge, when no human reviews the PR afterward). Invoked by review skills, not typically triggered directly by user phrasing.',
  'Read, Grep, Glob',
  'code-reviewer-body.md',
)

writeAgent(
  'plugins/second-opinion/agents',
  'fable-advisor',
  'fable',
  "Independent analysis, investigation, or solution design on an arbitrary task, using Claude's Fable tier for its judgment. Read-only — never edits files. Invoked only by the `fable` skill, not typically triggered directly by user phrasing.",
  'Read, Grep, Glob, Bash',
  'advisor-body.md',
)

writeAgent(
  'plugins/second-opinion/agents',
  'opus-advisor',
  'opus',
  "Independent analysis, investigation, or solution design on an arbitrary task, using Claude's Opus tier for its judgment. Read-only — never edits files. Invoked only by the `opus` skill, not typically triggered directly by user phrasing.",
  'Read, Grep, Glob, Bash',
  'advisor-body.md',
)
