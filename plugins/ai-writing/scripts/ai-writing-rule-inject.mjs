#!/usr/bin/env node
// PreToolUse(Write|Edit)フック。書き込み対象が人間読者向けの*.md(記事・README・
// レポート等)の場合のみ、AI臭を避けるための短いリマインダーをadditionalContext
// として注入する。AIエージェントの指示ファイル(SKILL.md/CLAUDE.md/AGENTS.md、
// .claude/skills//agents//rules/ 配下、および本リポジトリのplugin開発レイアウト
// plugins/<name>/skills//agents/ 配下)は意図的に簡潔・箇条書き中心のため対象外
// にする。skills/agents/rulesという名前のディレクトリ自体はこの用途と無関係に
// 存在しうるため、.claude/配下かplugins/<name>/配下のいずれかに限定してマッチ
// させる。
//
// permissionDecisionは返さない — additionalContextはpermissionDecisionと独立に
// 効くため、権限判定には一切関与せず通常の許可フローに委ねる。stdinのパース失敗や
// 対象外パスの場合は何も出力せずexit 0(fail-open)。

const EXCLUDE_RE = /(^|\/)(node_modules|vendor|dist|build|out|\.next|target|__pycache__|\.venv|venv|coverage)\//
const INSTRUCTION_DOC_RE = /(^|\/)\.claude\/(skills|agents|rules)\/|(^|\/)plugins\/[^/]+\/(skills|agents)\/|(^|\/)(SKILL|CLAUDE|AGENTS)\.md$/i
const MD_RE = /\.md$/i

const REMINDER = [
  'Before writing this prose document, apply the AI-smell checklist:',
  '- Take an actual stance or claim something specific — a sentence that could be true of any project is the "absence of a writer" tell. Cite concrete numbers, file paths, or outcomes instead of general statements.',
  '- Avoid formulaic openers/closers ("this article explains...", "hope this helps", "what did you think?") and stock hedges ("it could be said that...", "isn\'t it the case that...").',
  '- Vary sentence rhythm and length; do not force every section into a uniform bullet/three-point shape.',
  'A mechanical check runs after saving and will flag known offending phrases — this reminder covers what that check cannot catch.',
].join('\n')

async function readStdin() {
  const chunks = []
  for await (const chunk of process.stdin) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8')
}

let payload
try {
  payload = JSON.parse(await readStdin())
} catch {
  process.exit(0)
}

const filePath = payload?.tool_input?.file_path
if (!filePath || !MD_RE.test(filePath) || EXCLUDE_RE.test(filePath) || INSTRUCTION_DOC_RE.test(filePath)) {
  process.exit(0)
}

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      additionalContext: REMINDER,
    },
  }),
)
process.exit(0)
