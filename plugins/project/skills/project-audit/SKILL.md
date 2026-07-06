---
name: project-audit
description: >
  Occasional, thorough project-wide audit for issues no mechanical linter
  catches: friction an AI agent hits working in this repo (axis agent —
  CLAUDE.md/rules/docs that are ambiguous, contradictory, or drifted from
  the actual code; unclear test/lint/CI reproduction; fuzzy directory or
  package boundaries) and gaps from the project's own end-user's
  perspective (axis user — content/UX/functionality gaps, inferred from the
  project's own README/docs since "who the user is" differs per project:
  readers, CLI users, players, library consumers, etc). Uses parallel
  project-scanner (opus) sub-agents, one per axis, and a
  project-audit-confidence-filter (haiku) confidence filter, writing a
  report to tmp/project-audit-<date>.md. Trigger phrases —
  "プロジェクトを調査して", "課題を洗い出して", "issue案を出して",
  "開発時の障害を確認して", "/project-audit", "audit this project for
  issues", "find friction and gaps in this project". Do NOT use for
  security issues (that's `/security-audit`), comment leakage/narration
  (that's `/comment-audit`), per-diff review, or continuous in-session
  checks after each edit.
allowed-tools: Agent, Bash, Glob, Grep, Read, Write
---

## Purpose

Project-wide audit for problems that require judgment, not pattern
matching, across two axes:

- **Axis agent** — obstacles an AI coding agent hits working in *this*
  repo: CLAUDE.md / `.claude/rules/` / docs that are ambiguous, internally
  contradictory, or have drifted from what the code actually does; unclear
  or broken test/lint/type/CI reproduction steps; directory or package
  boundaries an agent would find confusing when adding something new;
  conventions that exist only as tribal knowledge, undocumented anywhere.
- **Axis user** — gaps from the perspective of whoever actually consumes
  this project's output. Unlike axis agent, this axis has no fixed
  checklist — "the user" is a blog reader for a content site, a CLI
  invoker for a tool, a Discord member for a bot, a player for a game, a
  library consumer for a package. Step 0 below infers which of these
  applies before the axis-user scanner runs.

This is Claude-led judgment, not deterministic pattern matching — like
`security-audit` and `comment-audit`, it can miss things or produce false
positives and is not a commit gate. Output is a written report only; no
in-session edits.

## When to invoke

- 「プロジェクトを調査して」「課題を洗い出して」「issue案を出して」
  「開発時の障害を確認して」
- `/project-audit` (optionally followed by paths: `/project-audit src/ docs/`)
- "audit this project for issues", "find friction and gaps in this project"

Do NOT invoke when:

- The user wants a security audit — that's `/security-audit`.
- The user wants comment-leakage/narration checked — that's `/comment-audit`.
- The user wants a per-diff / per-commit review — that's `/code-review`.
- The user wants issues fixed, not just found — this skill is audit-only;
  remediation is a separate user decision. Filing GitHub issues from the
  result is a separate skill (`/issue-triage`).
- The user wants continuous in-session checking after every edit rather
  than a periodic full-project sweep.

## Workflow

### 0. Product-type detection

Read the root `README.md` and the description field of whatever manifest
exists (`package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`,
`composer.json`). From these alone (not a deep read), write a 2-4 sentence
note: what this project's output is, and who consumes it (readers, CLI
users, a Discord community, players, library consumers, internal-only
tooling, etc). If the user's invocation already states who the user is,
use that instead of inferring.

This note is the only thing that makes axis-user tractable without a fixed
checklist — pass it to both Step-2 scanner calls.

### 1. Repository orientation (cheap, shared)

Unlike `security-audit`, there is no fixed dangerous-pattern grep to scope
down with. Instead, cheaply locate (paths only, do not deep-read here —
each Step-2 scanner does its own deep reading):

- Root `CLAUDE.md` and any nested `CLAUDE.md` files.
- `.claude/rules/*.md`, `docs/**/*.md`, or an equivalent conventions
  directory if one exists.

If the user passed explicit paths, use those as the audit scope instead of
the whole repo; still run Step 0 first.

### 2. Parallel fan-out — 2 axis sub-agents

In a **single response**, launch both Agent calls in parallel:
`subagent_type: project-scanner`, one per axis (`agent`, `user`), each
receiving: the axis name, the Step 0 product-type note, the Step 1 doc-path
list, and the scope (explicit paths, or "whole repo"). Axis definitions,
tool restrictions, and the no-speculation rule live in the agent itself.

If an axis call returns non-JSON, label `sub-agent-raw:<axis>` and carry
the prose forward — it bypasses Steps 4-5.

### 3. Integrate

Merge both axis result lists. Intra-axis dedupe by `file + line + finding`
(or `file + finding` when `line` is `0`/file-level). Unlike `security-audit`,
do **not** apply a cross-axis agreement bonus — axis agent and axis user
are not independent confirmations of the same defect; they look at
unrelated concerns by design.

### 4. Confidence scoring

Same batching discipline as `security-audit`/`comment-audit`: ≤ 50
structured findings → one `project-audit-confidence-filter` call; > 50 →
parallel chunks of 50 in input order, concatenate in chunk order.

**Length check (mandatory)**: after concatenating, if
`len(scores) != len(findings)`, halt and report a confidence-filter
failure — do not proceed with misaligned scores.

### 5. Filter

Drop findings with score < 80. `sub-agent-raw:*` entries are not scored
and not filtered.

**Report status**:
- ≥ 1 finding after filter OR ≥ 1 raw entry → **findings**: report normally.
- 0 findings, 0 raw, 0 failed → **clean**.
- 0 findings, 0 raw, ≥ 1 failed → **incomplete**: do not interpret as
  clean; re-run after investigating the failure.

### 6. Write report file

Path: `tmp/project-audit-<YYYY-MM-DD>.md` (workspace `tmp/`, not OS `/tmp`;
confirm it is gitignored before writing). `mkdir -p tmp/` if missing.
Overwrite any existing file at the same path.

**Report structure**: skeleton lives in `report-template.md`, a sibling of
this file. Always written in Japanese.

After writing, reply in Japanese with: report path, before/after counts,
and the single worst finding as a 1-line callout (if any survived the
filter).

## Critical rules

- **No fixed checklist for axis user.** It is derived per-project from
  Step 0 — never hardcode a specific product type's checklist into this
  skill's own files.
- **No speculation.** Every finding needs a concrete `file:line` (or an
  explicit whole-project observation with representative files cited) —
  never fill a gap with a guess, matching the source investigation
  prompts' own rule.
- **Parallel, not sequential**, within Step 2 — one response, 2 Agent uses.
- **No cross-axis bonus.** Axis agent and axis user are not independent
  confirmations of one defect.
- **Audit only — no remediation.** Do not edit any code or docs, even when
  a fix is obvious.
- **This skill does not file GitHub issues.** That is `/issue-triage`,
  which consumes this skill's report as one of its inputs.

## Anti-patterns

- ❌ Running this every commit or every session. It's periodic and
  thorough, like `security-audit`/`comment-audit`, not a hook.
- ❌ Reusing `security-audit`'s grep-based scope-down. There is no
  equivalent fixed dangerous-pattern list for general friction/gaps.
- ❌ Hardcoding a specific project's product type or user base into this
  skill's own prose — Step 0 must infer it fresh each run.
- ❌ Filling in a finding's evidence with a plausible-sounding guess.
- ❌ Adding a cross-axis agreement bonus, unlike `security-audit`'s model.
- ❌ Auto-fixing flagged issues or filing GitHub issues directly — both are
  separate, explicit user decisions (remediation, or `/issue-triage`).
