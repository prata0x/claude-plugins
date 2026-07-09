#!/usr/bin/env node
// 定型フレーズ辞書によるAI臭の機械チェック。日本語のAI生成文で繰り返し指摘される
// 典型的な定型句のみを対象にする — 語彙レベルの対策は構造・リズム面のAI臭までは
// 捉えられないが、機械チェックで拾える範囲はここまで、という割り切り。「これにより」
// 「ではないでしょうか」は通常の接続表現としても使われ、他エントリより誤検知が起き
// やすい既知のトレードオフ。両hookとも非block(PreToolUseはcontext注入のみ、
// PostToolUseのexit 2はcontextとして渡るだけ)なので、誤検知があっても書き込み
// 自体は妨げない。この辞書は陳腐化が速いため定期的な見直しが要る。
//
// 対象は *.md のうち、AIエージェントの指示ファイル(SKILL.md/CLAUDE.md/AGENTS.md、
// .claude/skills//agents//rules/ 配下、および本リポジトリのplugin開発レイアウト
// plugins/<name>/skills//agents/ 配下)を除く — それらは意図的に簡潔・箇条書き
// 中心であり、このチェックの前提(人間読者向けの散文)が成立しない。skills/agents/
// rulesという名前のディレクトリ自体はこの用途と無関係に存在しうるため、
// .claude/配下かplugins/<name>/配下のいずれかに限定してマッチさせる。
//
// 判定は物理行単位(ai-comment-check.mjsからの流用)。日本語散文は通常1段落=1論理行
// でsoft-wrapされるため実害は薄いが、ハードラップされたMarkdownで定型句が行境界を
// またぐ場合は検出できない。
//
// モード:
//   デフォルト — リポジトリ全体の追跡ファイルを対象にする。
//   --staged  — stdinからPreToolUseのhookペイロードを読み、`tool_input.command`
//               に`git commit`を含む場合のみ、stagedのdiffの追加行だけを
//               対象にする。CLIから明示的に使う用途で、既定のhooks.jsonには
//               配線していない — 定型句の混入は文体の好みであり、comment
//               pluginの漏洩検知と違ってcommitをblockするほどの欠陥ではない。
//   --edit    — stdinからPostToolUse(Edit|Write)のhookペイロードを読み、
//               そのツール呼び出しで書かれたテキストだけを対象にする(hook用、
//               既定で配線済み)。PostToolUseは非block・exit 2はstderrが
//               AI agentにcontextとして渡るのみ。stdinのパース失敗や対象
//               テキストが見つからない場合はexit 0(fail-open)。
//
// 終了コード: 0 違反無し(またはhook対象外)、2 違反あり。

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, statSync } from 'node:fs'

const EXCLUDE_RE = /(^|\/)(node_modules|vendor|dist|build|out|\.next|target|__pycache__|\.venv|venv|coverage)\//
const INSTRUCTION_DOC_RE = /(^|\/)\.claude\/(skills|agents|rules)\/|(^|\/)plugins\/[^/]+\/(skills|agents)\/|(^|\/)(SKILL|CLAUDE|AGENTS)\.md$/i
const MD_RE = /\.md$/i
const STAGED_MODE = process.argv.includes('--staged')
const EDIT_MODE = process.argv.includes('--edit')

function inScope(filePath) {
  return MD_RE.test(filePath) && !EXCLUDE_RE.test(filePath) && !INSTRUCTION_DOC_RE.test(filePath)
}

// 違反1件ごとの理由文言。AI agentが読むため英語。
const REASON_HEDGE_CLOSER =
  'A stock hedge/closer phrase (と言えるでしょう / ではないでしょうか / と言っても過言ではありません). It performs caution without adding information — state the claim directly or cut it.'
const REASON_VERBOSE_CAUSAL =
  'A verbose causal connector (これにより) that AI models default to. Prefer a plainer connector, or restructure the sentence.'
const REASON_FORMULAIC_OPENER =
  'A formulaic self-referential opener announcing what the document will explain (本稿では〜を解説します). State the content directly instead of narrating the document\'s own structure.'
const REASON_FORMULAIC_CLOSER =
  'A formulaic wrap-up closer (いかがでしたか / 参考になれば幸いです / 今後の動向に注目). Generic blog-post boilerplate that adds no content — cut it or replace with a concrete next step.'
const REASON_CHATBOT_REMNANT =
  'A leftover chatbot-register phrase (もちろんです！/ 承知しました) that doesn\'t belong in written prose. Delete it.'
const REASON_OVEREMPHASIS =
  'An overemphasis stock phrase (非常に重要です / 極めて重要な意味を持ちます) that asserts importance instead of demonstrating it. Show the specific reason it matters, or cut the phrase.'

const PATTERNS = [
  { re: 'と言えるでしょう', reason: REASON_HEDGE_CLOSER },
  { re: 'ではないでしょうか', reason: REASON_HEDGE_CLOSER },
  { re: 'と言っても過言ではありません', reason: REASON_HEDGE_CLOSER },
  { re: 'これにより', reason: REASON_VERBOSE_CAUSAL },
  { re: '本稿では.{0,30}(解説|説明)', reason: REASON_FORMULAIC_OPENER },
  { re: 'この記事では.{0,30}(解説|説明)', reason: REASON_FORMULAIC_OPENER },
  { re: 'いかがでした(か|でしょうか)', reason: REASON_FORMULAIC_CLOSER },
  { re: '参考になれば幸いです', reason: REASON_FORMULAIC_CLOSER },
  { re: '今後の動向に注目', reason: REASON_FORMULAIC_CLOSER },
  { re: 'ぜひ.{0,10}(試してみて|活用して)ください', reason: REASON_FORMULAIC_CLOSER },
  { re: 'もちろんです[！!]', reason: REASON_CHATBOT_REMNANT },
  { re: '非常に重要です', reason: REASON_OVEREMPHASIS },
  { re: '極めて重要な意味を持ちます', reason: REASON_OVEREMPHASIS },
]
const COMPILED_PATTERNS = PATTERNS.map(({ re, reason }) => ({ re: new RegExp(re), reason }))

function matchedReasons(text) {
  const reasons = new Set()
  for (const { re, reason } of COMPILED_PATTERNS) {
    if (re.test(text)) reasons.add(reason)
  }
  return [...reasons]
}

async function readStdin() {
  const chunks = []
  for await (const chunk of process.stdin) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8')
}

const MAX_BUFFER = 1024 * 1024 * 1024

function wholeRepoTargets() {
  const files = execFileSync('git', ['ls-files'], { encoding: 'utf8', maxBuffer: MAX_BUFFER })
    .split('\n')
    .filter(Boolean)
    .filter((f) => inScope(f) && existsSync(f) && statSync(f).isFile())

  const targets = []
  for (const f of files) {
    readFileSync(f, 'utf8')
      .split('\n')
      .forEach((text, i) => targets.push({ file: f, lineNo: i + 1, text }))
  }
  return targets
}

function stagedAddedTargets() {
  const diff = execFileSync(
    'git',
    ['diff', '--cached', '-U0', '--no-color', '--', '*.md'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: MAX_BUFFER },
  )
  const targets = []
  let currentFile = null
  let newLineNo = null
  let currentInScope = false
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ ')) {
      const m = line.match(/^\+\+\+ b\/(.*)$/)
      currentFile = m ? m[1] : null
      currentInScope = currentFile ? inScope(currentFile) : false
    } else if (line.startsWith('@@')) {
      const m = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)/)
      newLineNo = m ? Number(m[1]) : null
    } else if (line.startsWith('+') && !line.startsWith('+++') && currentInScope && currentFile && newLineNo != null) {
      targets.push({ file: currentFile, lineNo: newLineNo, text: line.slice(1) })
      newLineNo++
    }
  }
  return targets
}

function editedTargets(payload) {
  const filePath = payload?.tool_input?.file_path
  if (!filePath || !inScope(filePath)) return []

  // Edit/Writeで新しく書かれたテキスト断片を集める。tool_inputのフィールド名は
  // ツールとエージェント実装のバージョンにより揺れうるため、候補キーを複数探索する。
  const ti = payload?.tool_input ?? {}
  const newTexts = [ti.content, ti.file_text, ti.new_string, ti.new_text].filter((v) => typeof v === 'string')
  if (Array.isArray(ti.operations)) {
    for (const op of ti.operations) {
      if (typeof op?.new_text === 'string') newTexts.push(op.new_text)
      if (typeof op?.new_string === 'string') newTexts.push(op.new_string)
    }
  }
  if (newTexts.length === 0 || !existsSync(filePath)) return []

  const fileContent = readFileSync(filePath, 'utf8')
  const targets = []
  for (const newText of newTexts) {
    const idx = fileContent.indexOf(newText)
    if (idx === -1) continue
    const startLine = fileContent.slice(0, idx).split('\n').length
    newText.split('\n').forEach((text, i) => targets.push({ file: filePath, lineNo: startLine + i, text }))
  }
  return targets
}

function findViolations(targets) {
  return targets
    .map((t) => ({ ...t, reasons: matchedReasons(t.text) }))
    .filter((t) => t.reasons.length > 0)
}

function report(violations) {
  if (violations.length === 0) process.exit(0)
  // exitはwrite完了後のcallbackで行う。stderrがpipeの場合、大量出力後に
  // 即process.exit()すると書き込みがflushされる前にプロセスが終了し、
  // 出力が非決定的に欠落することがある。
  const lines = violations.map((v) => `${v.file}:${v.lineNo}: ${v.reasons.join(' / ')}`)
  process.stderr.write(`${lines.join('\n')}\n`, () => process.exit(2))
}

if (EDIT_MODE) {
  let payload
  try {
    payload = JSON.parse(await readStdin())
  } catch {
    process.exit(0)
  }
  report(findViolations(editedTargets(payload)))
} else if (STAGED_MODE) {
  let cmd = ''
  try {
    const payload = await readStdin()
    cmd = JSON.parse(payload)?.tool_input?.command ?? ''
  } catch {
    process.exit(0)
  }
  if (!cmd.includes('git commit')) process.exit(0)

  let targets = []
  try {
    targets = stagedAddedTargets()
  } catch {
    process.exit(0)
  }
  report(findViolations(targets))
} else {
  report(findViolations(wholeRepoTargets()))
}
