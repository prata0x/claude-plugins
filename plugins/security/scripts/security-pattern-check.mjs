#!/usr/bin/env node
// 機械的・文脈不要なAIエージェント向けセキュリティアンチパターンチェック。
//
// 判断を要しないチェックのみをここに置く(文字列があるか無いかだけの話)。
// 文脈が必要なもの(このMath.random()呼び出しが実際にセキュリティ上重要か、
// テナント境界が本当に欠けているか、等)はここでは扱わない — それはgrep
// スクリプトではなくモデルによる判定パスの仕事。
//
// 深刻度:
//   FAIL — 曖昧さが無く、常にブロックする価値がある。
//   WARN — 実際にシグナルはあるが正当な用途もあるため、出力はするが実行は失敗させない。
//
// モード:
//   デフォルト — リポジトリ全体の追跡ファイルを対象にする(CI用)。
//   --staged  — stdinからClaude Code PreToolUseのhookペイロードを読み、
//               `tool_input.command`に`git commit`を含む場合のみ、staged
//               diffの追加行だけを対象にする(hook用)。IAMのAction/Resource
//               同一ファイル内共起チェックは、対象範囲内(追加行のみ)での
//               共起判定になる — リポジトリ全体を見るのはCIの役割。
//
// 終了コード: 0 クリーン(警告は出力されることがある)、2 FAILが1件以上。

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { findSecretPattern } from './lib/secret-patterns.mjs'

const REPO_ROOT = (() => {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim()
  } catch {
    return process.cwd()
  }
})()
process.chdir(REPO_ROOT)

const EXCLUDE_RE = /(^|\/)(node_modules|vendor|dist|build|out|\.next|target|__pycache__|\.venv|venv|coverage)\//
const STAGED_MODE = process.argv.includes('--staged')

let violations = 0
const warn = (msg) => console.error(`WARN: ${msg}`)
const fail = (msg) => {
  console.error(`FAIL: ${msg}`)
  violations += 1
}

async function readStdin() {
  const chunks = []
  for await (const chunk of process.stdin) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8')
}

function wholeRepoTargets() {
  const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
    .filter((f) => !EXCLUDE_RE.test(f) && existsSync(f) && statSync(f).isFile())

  const targets = []
  for (const f of files) {
    readFileSync(f, 'utf8')
      .split('\n')
      .forEach((text, i) => targets.push({ file: f, lineNo: i + 1, text }))
  }
  return targets
}

function stagedAddedTargets() {
  const diff = execFileSync('git', ['diff', '--cached', '-U0', '--no-color'], { encoding: 'utf8' })
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
  return targets.filter((t) => !EXCLUDE_RE.test(t.file))
}

// --- ハードコードされたシークレット ---
function checkSecrets(targets) {
  for (const { file, lineNo, text } of targets) {
    if (findSecretPattern([text])) fail(`hardcoded secret pattern in ${file}:${lineNo}`)
  }
}

// --- pin留めされていないGitHub Actions ---
function checkGhActionsPinning(targets) {
  for (const { file, lineNo, text } of targets) {
    if (!/^\.github\/workflows\/.*\.ya?ml$/.test(file)) continue
    // 行頭(の`- `)からのYAMLキーのみを対象にする。アンカー無しだと、
    // run:ブロック内のシェル文字列中に偶然"uses:"を含む行(grepパターン文字列等)
    // を実際のaction参照と誤認識する。
    const m = text.match(/^\s*(?:-\s*)?uses:\s*(\S+)/)
    if (!m) continue
    const token = m[1]
    if (token.startsWith('./') || token.startsWith('docker://')) continue
    const ref = token.split('@').pop()
    if (!/^[0-9a-f]{40}$/.test(ref)) {
      fail(`unpinned GitHub Action in ${file}:${lineNo} — ${token} (pin to a full commit SHA)`)
    }
  }
}

// --- IAMの過剰権限 ---
function checkIamOverreach(targets) {
  // 粗い判定: 対象範囲(全体スキャンならファイル全体、staged scanなら追加行のみ)
  // 内でワイルドカードが両方出現しているかだけを見ており、同じstatement内とは
  // 限らない。複数statementを持つ大きなポリシーファイルでは誤検知の余地がある
  // — ヒットは「要確認」であって確定判定ではない。
  const byFile = new Map()
  for (const { file, lineNo, text } of targets) {
    if (!/\.(tf|json|ya?ml)$/.test(file)) continue
    if (/AdministratorAccess/.test(text)) fail(`AdministratorAccess policy reference in ${file}:${lineNo}`)
    if (!byFile.has(file)) byFile.set(file, { action: false, resource: false })
    const entry = byFile.get(file)
    if (/"Action"\s*:\s*"\*"|Action:\s*"?\*"?/.test(text)) entry.action = true
    if (/"Resource"\s*:\s*"\*"|Resource:\s*"?\*"?/.test(text)) entry.resource = true
  }
  for (const [file, { action, resource }] of byFile) {
    if (action && resource) {
      fail(`wildcard Action AND Resource in the same IAM-like file: ${file} (verify they're not the same statement)`)
    }
  }
}

// --- 生のHTMLインジェクションシンク — WARN、サニタイズ済みの可能性あり ---
function checkHtmlSinks(targets) {
  for (const { file, lineNo, text } of targets) {
    if (!/\.(js|jsx|ts|tsx)$/.test(file)) continue
    if (/dangerouslySetInnerHTML|\.innerHTML\s*=/.test(text)) {
      warn(`raw HTML injection sink in ${file}:${lineNo} — verify the value is sanitized`)
    }
  }
}

// --- ワイルドカードCORS / CSP frame-ancestors — WARN、意図的な公開エンドポイントの可能性あり ---
function checkWildcardCors(targets) {
  for (const { file, lineNo, text } of targets) {
    if (/Access-Control-Allow-Origin['"]?\s*[:,=]\s*['"]\*|frame-ancestors\s+\*/.test(text)) {
      warn(`wildcard CORS/CSP pattern in ${file}:${lineNo} — confirm this endpoint carries no credentials`)
    }
  }
}

// --- シークレットらしき名前に対する空文字列フォールバック — WARN、名前ベースのヒューリスティック ---
function checkEmptySecretFallback(targets) {
  for (const { file, lineNo, text } of targets) {
    if (/\|\|\s*['"]{2}/.test(text) && /secret|token|api[_-]?key|password/i.test(text)) {
      warn(`possible silent fallback to empty string near a secret-like name in ${file}:${lineNo}`)
    }
  }
}

function runChecks(targets) {
  checkSecrets(targets)
  checkGhActionsPinning(targets)
  checkIamOverreach(targets)
  checkHtmlSinks(targets)
  checkWildcardCors(targets)
  checkEmptySecretFallback(targets)

  if (violations > 0) {
    console.error(`security-pattern-check: ${violations} hard violation(s) found.`)
    process.exit(2)
  }
  console.log('security-pattern-check: clean (warnings, if any, are non-blocking).')
  process.exit(0)
}

if (!STAGED_MODE) {
  runChecks(wholeRepoTargets())
} else {
  let cmd = ''
  try {
    const payload = await readStdin()
    cmd = JSON.parse(payload)?.tool_input?.command ?? ''
  } catch {
    process.exit(0)
  }
  if (!cmd.includes('git commit')) process.exit(0)
  runChecks(stagedAddedTargets())
}
