#!/usr/bin/env node
// AI agentが書きがちな、人間なら書かないような形のコメントを検知する。
// 現況描写・先送り予告・即興のラベル/作業分割・計画やプロンプトへの参照・変更の
// ナレーション・自己完結しない外部参照・日付の直書き・自己言及的なcommit参照、
// を英語/日本語の両方で対象にする。対象言語はTypeScript/JavaScript/Python/Shell/
// PowerShell/C#/HTML/CSS(拡張子から行コメントのマーカーを選択)。例外はマーカー
// 直後の`TODO:`のみ。
//
// モード:
//   デフォルト — リポジトリ全体の追跡ファイルを対象にする。
//   --staged  — stdinからPreToolUseのhookペイロードを読み、`tool_input.command`
//               に`git commit`を含む場合のみ、stagedのdiffの追加行だけを
//               対象にする(hook用)。stdinのパース失敗やgit commit以外の
//               コマンド、diff取得失敗はexit 0(fail-open)。
//   --edit    — stdinからPostToolUse(Edit|Write)のhookペイロードを読み、
//               そのツール呼び出しで書かれたテキストだけを対象にする(hook用)。
//               PostToolUseは非block・exit 2はstderrがAI agentにcontext
//               として渡るのみ。stdinのパース失敗や対象テキストが見つからない
//               場合はexit 0(fail-open)。
//
// 終了コード: 0 違反無し(またはhook対象外)、2 違反あり。
// このチェックはスタイル上の衛生管理であり、セキュリティゲートではない。

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, statSync } from 'node:fs'

const EXCLUDE_RE = /(^|\/)(node_modules|vendor|dist|build|out|\.next|target|__pycache__|\.venv|venv|coverage)\//
const STAGED_MODE = process.argv.includes('--staged')
const EDIT_MODE = process.argv.includes('--edit')

// 拡張子ごとの行コメントマーカー。マーカー自体の対象言語判定と、
// マーカー直後をパターン一致の起点にする役目を兼ねる。
const COMMENT_MARKERS = {
  '.ts': '//',
  '.tsx': '//',
  '.js': '//',
  '.jsx': '//',
  '.mjs': '//',
  '.cjs': '//',
  '.cs': '//',
  '.py': '#',
  '.sh': '#',
  '.bash': '#',
  '.ps1': '#',
  '.psm1': '#',
  '.css': '/*',
  '.html': '<!--',
  '.htm': '<!--',
}
const EXT_RE = new RegExp(`(${Object.keys(COMMENT_MARKERS).map((e) => e.replace('.', '\\.')).join('|')})$`, 'i')
const STAGED_PATHSPECS = Object.keys(COMMENT_MARKERS).map((e) => `*${e}`)

function markerFor(filePath) {
  const m = filePath.match(/\.[^./]+$/)
  return m ? COMMENT_MARKERS[m[0].toLowerCase()] : undefined
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// 違反1件ごとに、なぜ禁止か・どう直すかを返すための理由文言。AI agentが読むため英語。
const REASON_ADHOC_LABEL =
  'An ad hoc label or work breakdown an AI agent invented on the spot. No record of it exists outside this session, so it is meaningless on a later read. Drop the label; state only what is actually needed.'
const REASON_EXTERNAL_REF =
  'Understanding it requires leaving the comment (an external doc, git log, issue tracker, etc.) — the comment fails to be self-contained. Write the needed explanation directly in the comment, or delete it.'
const REASON_PR_ISSUE =
  'A PR/Issue number citation. Understanding it requires visiting an external page — the comment fails to be self-contained. Put such references in the commit message, not in a code comment.'
const REASON_DATE = 'A hardcoded date. Duplicates information git blame/log already tracks. Remove the date itself.'
const REASON_PLAN_REFERENCE =
  "References the AI agent's own session-local plan, prompt, or task/ticket instructions. That context doesn't exist outside this session. State only what the code does."
const REASON_CHANGE_NARRATION =
  'Narrates how the code changed (before/after state). That belongs in a commit message or PR description, not the source. Describe what the code does now, or delete it.'
const REASON_STATE_NOW =
  'Describes the current state. Becomes false the moment the implementation changes. State a durable constraint instead, or delete it.'
const REASON_FUTURE_PROMISE =
  'A deferred-work promise. Stays behind even after the work ships, and is false until then. Rewrite as `// TODO: <content>`.'
const REASON_SELF_COMMIT =
  'Self-referential deixis ("in this commit..."). On a later read, which commit "this" refers to is unanswerable — the phrase is meaningless. Delete it.'

// 各要素: マッチする正規表現と、違反時に返す理由。
const PATTERNS = [
  { re: '[A-Za-z]-[0-9]+[a-z]*[ A-Za-z]*:', reason: REASON_ADHOC_LABEL }, // ラベル直後をスペース/英字+`:`に絞り、CSSユーティリティ(h-9)や範囲表記(X-1..X-9)との衝突を避ける
  { re: 'Q-?[0-9]+', reason: REASON_ADHOC_LABEL },
  { re: '[①-⑳]\\.', reason: REASON_ADHOC_LABEL }, // 丸数字+ピリオドの即興手順分割(例: ①.API通信 ②.Pop作成 ③.Pop表示)
  { re: 'Phase [0-9A-Z]', reason: REASON_ADHOC_LABEL },
  // \b: rarityTier等のdomain複合語を除外。番号直後に区切り記号を要求するのは、
  // 区切りが無い"Tier N"は恒久的なdomain分類(例: 演出時間の頻度/重要度によるTier
  // 1/2/3)として地の文で使われることが多く、それらを除外するため。
  { re: '\\bTier [0-9]+(?:-[A-Za-z0-9]+)?\\s*[:.\\-–—/]', reason: REASON_ADHOC_LABEL },
  { re: '(?:Stage|Section|Part) [0-9]+\\s*[:.\\-–—]', reason: REASON_ADHOC_LABEL },
  { re: 'docs/', reason: REASON_EXTERNAL_REF },
  { re: '§[0-9]', reason: REASON_EXTERNAL_REF },
  { re: 'commit [0-9a-f]{6,}', reason: REASON_EXTERNAL_REF },
  { re: '\\(project_', reason: REASON_EXTERNAL_REF },
  { re: '\\(feedback_', reason: REASON_EXTERNAL_REF },
  // 大文字小文字とスペース有無を問わず拾う(pr#1 / PR #1 / issue#123 / Issue #123)。
  // #直後を[1-9]にし、0埋め表記(#007等)や全桁0(#000・#000000、16進カラーコードで頻出)を除外する
  // — issue/PR番号は1以上かつ0埋めしない。
  { re: '\\b(?:[Pp][Rr]|[Ii][Ss][Ss][Uu][Ee])\\s*#[1-9]\\d*', reason: REASON_PR_ISSUE },
  // GitHubのsquash-merge既定書式や、"issue"を省略した"(#123)"だけの引用も拾う。
  { re: '\\(#[1-9]\\d*\\)', reason: REASON_PR_ISSUE },
  { re: '202[0-9]-[0-9]{2}', reason: REASON_DATE },
  { re: '202[0-9]/[0-9]+', reason: REASON_DATE },

  { re: 'step \\d+ of the plan', reason: REASON_PLAN_REFERENCE },
  { re: 'as (?:per|requested) (?:the )?(?:requirements?|spec|task|ticket|prompt|instructions?)', reason: REASON_PLAN_REFERENCE },
  { re: 'per the (?:spec|requirements?|task|ticket|plan|prompt|instructions?)', reason: REASON_PLAN_REFERENCE },
  { re: 'from the (?:task|todo|plan|spec|ticket|prompt|requirements?)', reason: REASON_PLAN_REFERENCE },
  { re: 'implement(?:ing|s|ed)? use\\s*case \\d*', reason: REASON_PLAN_REFERENCE },
  { re: 'requirements? doc|requirement \\d+', reason: REASON_PLAN_REFERENCE },
  { re: 'as (?:instructed|specified|outlined) (?:above|below|in the)', reason: REASON_PLAN_REFERENCE },
  { re: 'previously[,:]? (?:this|we|it|the)', reason: REASON_CHANGE_NARRATION },
  { re: 'used to (?:be|use|call|return|do|have|rely)', reason: REASON_CHANGE_NARRATION },
  { re: 'changed (?:\\w+ ){0,3}from .+ to', reason: REASON_CHANGE_NARRATION },
  { re: 'no longer (?:needed|used|required|necessary|calls?|returns?|does)', reason: REASON_CHANGE_NARRATION },
  { re: 'this was .+ but now', reason: REASON_CHANGE_NARRATION },
  { re: 'we (?:now|used to) (?:no longer )?(?:use|call|return|do|have)', reason: REASON_CHANGE_NARRATION },
  { re: 'replaced the (?:old|previous|former)', reason: REASON_CHANGE_NARRATION },
  { re: '(?:was|were) (?:renamed|moved|removed|refactored|extracted) (?:from|to|out of)', reason: REASON_CHANGE_NARRATION },
  { re: 'we (?:moved|used to)|refactor(?:ed)? from', reason: REASON_CHANGE_NARRATION },
  { re: 'as things (?:currently )?stand|in its current form', reason: REASON_STATE_NOW },
  { re: 'for now\\b', reason: REASON_STATE_NOW },
  { re: 'as (?:the |an )?MVP\\b', reason: REASON_STATE_NOW },
  { re: 'not yet in production|before (?:it )?goes? live', reason: REASON_STATE_NOW },
  { re: 'once (?:it\'?s? )?in production|after (?:it )?goes? live', reason: REASON_STATE_NOW },
  { re: 'going forward', reason: REASON_FUTURE_PROMISE },
  { re: 'we plan to|planned to', reason: REASON_FUTURE_PROMISE },
  { re: 'in a (?:later|follow-up|subsequent) commit', reason: REASON_FUTURE_PROMISE },
  { re: 'in this commit\\b', reason: REASON_SELF_COMMIT },

  { re: '指示通り|依頼通り|要件通り|仕様書通り', reason: REASON_PLAN_REFERENCE },
  { re: 'ユースケース[0-9]+', reason: REASON_PLAN_REFERENCE },
  { re: '要件定義書|要件[0-9]+', reason: REASON_PLAN_REFERENCE },
  { re: '以前は', reason: REASON_CHANGE_NARRATION },
  { re: 'もともとは', reason: REASON_CHANGE_NARRATION },
  { re: 'から.{0,15}に変更', reason: REASON_CHANGE_NARRATION },
  { re: 'もう(?:不要|使わない|呼ばれない|返さない)', reason: REASON_CHANGE_NARRATION },
  { re: 'だったが今は', reason: REASON_CHANGE_NARRATION },
  { re: '(?:旧|以前の|古い).{0,10}(?:を|に)?置き換えた', reason: REASON_CHANGE_NARRATION }, // 「置き換えたい」等の希望形と区別するため旧/以前の/古い等の修飾を必須にする
  { re: '(?:関数|ファイル|モジュール|コンポーネント).{0,10}から(?:リネーム|改名|移動|削除|抽出|分離)', reason: REASON_CHANGE_NARRATION },
  { re: '移行した', reason: REASON_CHANGE_NARRATION },
  { re: '現状|現時点', reason: REASON_STATE_NOW },
  { re: '暫定|一時運用|当面', reason: REASON_STATE_NOW },
  { re: 'MVP として', reason: REASON_STATE_NOW },
  { re: '本番未稼働', reason: REASON_STATE_NOW },
  { re: '本番稼働後', reason: REASON_STATE_NOW },
  { re: '今後', reason: REASON_FUTURE_PROMISE },
  { re: '予定', reason: REASON_FUTURE_PROMISE },
  { re: '後続 commit', reason: REASON_FUTURE_PROMISE },
  { re: '将来', reason: REASON_FUTURE_PROMISE },
  { re: '本 commit', reason: REASON_SELF_COMMIT },
]
const COMPILED_PATTERNS = PATTERNS.map(({ re, reason }) => ({ re: new RegExp(re), reason }))
const PATTERN_ALTERNATION = PATTERNS.map((p) => p.re).join('|')

// (?<!:) : マーカー直前が`:`の場合(`http://`/`https://`等のURLリテラル)は
// 実コメントの開始ではないため除外する。
const violationReCache = new Map()
function violationRegexFor(marker) {
  if (!violationReCache.has(marker)) {
    violationReCache.set(marker, new RegExp(`(?<!:)${escapeRe(marker)}.*(${PATTERN_ALTERNATION})`))
  }
  return violationReCache.get(marker)
}

const todoReCache = new Map()
function todoRegexFor(marker) {
  if (!todoReCache.has(marker)) {
    todoReCache.set(marker, new RegExp(`(?<!:)${escapeRe(marker)}\\s*TODO:`))
  }
  return todoReCache.get(marker)
}

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
    .filter((f) => EXT_RE.test(f) && !EXCLUDE_RE.test(f) && existsSync(f) && statSync(f).isFile())

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
    ['diff', '--cached', '-U0', '--no-color', '--', ...STAGED_PATHSPECS],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: MAX_BUFFER },
  )
  const targets = []
  let currentFile = null
  let newLineNo = null
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ ')) {
      const m = line.match(/^\+\+\+ b\/(.*)$/)
      currentFile = m ? m[1] : null
    } else if (line.startsWith('@@')) {
      const m = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)/)
      newLineNo = m ? Number(m[1]) : null
    } else if (line.startsWith('+') && !line.startsWith('+++') && currentFile && newLineNo != null) {
      targets.push({ file: currentFile, lineNo: newLineNo, text: line.slice(1) })
      newLineNo++
    }
  }
  return targets
}

function editedTargets(payload) {
  const filePath = payload?.tool_input?.file_path
  if (!filePath || !EXT_RE.test(filePath) || EXCLUDE_RE.test(filePath)) return []

  // Edit/Writeで新しく書かれたテキスト断片を集める。tool_inputのフィールド名は
  // ツールとClaude Codeのバージョンにより揺れうるため、候補キーを複数探索する。
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
    .filter(({ file, text }) => {
      const marker = markerFor(file)
      if (!marker || !text.includes(marker)) return false
      if (todoRegexFor(marker).test(text)) return false
      return violationRegexFor(marker).test(text)
    })
    .map((t) => ({ ...t, reasons: matchedReasons(t.text) }))
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
