#!/usr/bin/env node
// PostToolUse(Edit|MultiEdit|Write)フック。編集されたファイルに対応する
// 整形ツールの設定(prettier/biome/ruff/black/go.mod/Cargo.toml/.csproj)が
// 対象プロジェクトに見つかった場合のみ整形コマンドを実行する。設定が無い、
// ツール本体が無い、整形コマンドが失敗した、のいずれでも何もせず
// exit 0(fail-open) — 利便性のためのフックであり、品質ゲートではない。
//
// 終了コード: 常に0。

import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

async function readStdin() {
  const chunks = []
  for await (const chunk of process.stdin) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8')
}

function repoRootFrom(cwd) {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8' }).trim()
  } catch {
    return cwd
  }
}

function exists(root, ...names) {
  return names.some((n) => existsSync(path.join(root, n)))
}

function fileMatches(root, name, re) {
  try {
    return re.test(readFileSync(path.join(root, name), 'utf8'))
  } catch {
    return false
  }
}

function packageJsonHasKey(root, key) {
  try {
    return Object.hasOwn(JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')), key)
  } catch {
    return false
  }
}

function hasCommand(name, env) {
  try {
    execFileSync('sh', ['-c', `command -v -- ${JSON.stringify(name)}`], { env, stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

function run(cmd, args, cwd, env) {
  try {
    execFileSync(cmd, args, { cwd, env, stdio: 'ignore' })
  } catch {
    // 整形コマンドの失敗はこのフックの関心事ではない(fail-open)。
  }
}

// filePathを含む.csprojを直下の階層から上に辿って探し、無ければrootの.slnを返す。
function findDotnetProject(filePath, root) {
  let dir = path.dirname(filePath)
  for (;;) {
    let entries = []
    try {
      entries = readdirSync(dir)
    } catch {
      entries = []
    }
    const csproj = entries.find((f) => f.endsWith('.csproj'))
    if (csproj) return path.join(dir, csproj)
    if (dir === root || dir === path.dirname(dir)) break
    dir = path.dirname(dir)
  }
  try {
    const sln = readdirSync(root).find((f) => f.endsWith('.sln'))
    if (sln) return path.join(root, sln)
  } catch {
    // ignore
  }
  return null
}

const PRETTIER_EXT = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.mts', '.cts',
  '.json', '.jsonc', '.css', '.scss', '.html', '.vue', '.md', '.mdx', '.yaml', '.yml',
])
const PRETTIER_CONFIGS = [
  '.prettierrc', '.prettierrc.json', '.prettierrc.yaml', '.prettierrc.yml',
  '.prettierrc.js', '.prettierrc.cjs', '.prettierrc.mjs',
  'prettier.config.js', 'prettier.config.cjs', 'prettier.config.mjs',
]

function formatFile(filePath, root, env) {
  const ext = path.extname(filePath).toLowerCase()

  if (PRETTIER_EXT.has(ext)) {
    if (exists(root, 'biome.json', 'biome.jsonc') && hasCommand('biome', env)) {
      run('biome', ['format', '--write', filePath], root, env)
    } else if ((exists(root, ...PRETTIER_CONFIGS) || packageJsonHasKey(root, 'prettier')) && hasCommand('prettier', env)) {
      run('prettier', ['--write', filePath], root, env)
    }
    return
  }

  if (ext === '.py') {
    if ((exists(root, 'ruff.toml', '.ruff.toml') || fileMatches(root, 'pyproject.toml', /\[tool\.ruff/)) && hasCommand('ruff', env)) {
      run('ruff', ['format', filePath], root, env)
    } else if (fileMatches(root, 'pyproject.toml', /\[tool\.black/) && hasCommand('black', env)) {
      run('black', [filePath], root, env)
    }
    return
  }

  if (ext === '.go') {
    if (exists(root, 'go.mod') && hasCommand('gofmt', env)) {
      run('gofmt', ['-w', filePath], root, env)
    }
    return
  }

  if (ext === '.rs') {
    if (exists(root, 'Cargo.toml') && hasCommand('rustfmt', env)) {
      run('rustfmt', [filePath], root, env)
    }
    return
  }

  if (ext === '.cs') {
    if (!hasCommand('dotnet', env)) return
    const project = findDotnetProject(filePath, root)
    if (project) run('dotnet', ['format', project, '--include', filePath, '--no-restore'], root, env)
  }
}

let payload
try {
  payload = JSON.parse(await readStdin())
} catch {
  process.exit(0)
}

const cwd = payload?.cwd ?? process.cwd()
let filePath = payload?.tool_input?.file_path
if (typeof filePath !== 'string' || filePath.length === 0) process.exit(0)
if (!path.isAbsolute(filePath)) filePath = path.resolve(cwd, filePath)
if (!existsSync(filePath)) process.exit(0)

const root = repoRootFrom(cwd)
const env = { ...process.env, PATH: `${path.join(root, 'node_modules', '.bin')}:${process.env.PATH}` }

formatFile(filePath, root, env)
process.exit(0)
