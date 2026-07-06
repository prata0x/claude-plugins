---
name: comment-audit
description: >
  Occasional, thorough project-wide audit for AI-agent comment issues that
  ai-comment-check.mjs's regex hook structurally cannot catch: cross-project /
  cross-repo / private-implementation references leaking into comments
  (axis A — highest priority, open-vocabulary and irreversible once public),
  session-narrative decision paraphrases the fixed phrase list misses
  (axis B), and review-rebuttal / correction framing (axis C). Uses parallel
  comment-leak-scanner (opus) sub-agents per axis/chunk and a
  comment-audit-confidence-filter (haiku) confidence filter, writing a report
  to tmp/comment-audit-<date>.md. Trigger phrases — "コメント監査して",
  "AIコメントの漏洩チェック", "他プロジェクト名の漏洩確認", "コメントのセッション性チェック",
  "/comment-audit", "audit comments for leakage", "check comments for
  session-local narration". Do NOT use for per-diff / per-commit review (that's
  the ai-comment-check.mjs hook) or for continuous in-session checks after
  each edit.
allowed-tools: Agent, Bash, Read, Write
---

## Purpose

Project-wide audit of **existing, already-committed** comments for 3
categories that `ai-comment-check.mjs`'s regex hook structurally cannot
catch, because each needs open-vocabulary or rhetorical judgment rather than
fixed phrase matching:

- **Axis A — cross-project / cross-repo / private-implementation leakage**
  (highest priority). A comment names another project, repository,
  organization, internal service/tool, or describes another codebase's
  specific files/implementation. The vocabulary here is unbounded — it
  cannot be regex-enumerated — and it is the highest-stakes axis: once a
  comment like this reaches a public remote, the leak is irreversible.
- **Axis B — session-narrative decision paraphrase**. A comment describes a
  decision made or a change performed during a coding session, phrased so it
  only makes sense with memory of that session, without using any of the
  hook's fixed trigger words. Lower priority than A — this substantially
  overlaps what the hook's `CHANGE_NARRATION` / `STATE_NOW` /
  `PLAN_REFERENCE` patterns already catch; this axis only adds paraphrase
  recall at the cost of some false positives.
- **Axis C — review-rebuttal / correction framing**. A comment phrased as a
  rebuttal to, or correction of, a specific prior review comment or a
  now-replaced approach. Highest false-positive risk of the three:
  legitimate durable rationale for a design choice reads similarly to a
  narrated correction.

This is Claude-led semantic judgment, not deterministic pattern matching —
unlike the hook, it can miss things or produce false positives and is not a
commit gate. Output is a written report only; no in-session edits.

**Note for maintainers of this file**: this skill's own prose must stay
fully generic — never name a specific other repository or project here,
even as an example. This file can end up shipped inside a public repo, and
doing so would itself be an axis-A violation.

## When to invoke

- 「コメント監査して」「AIコメントの漏洩チェックして」「他プロジェクト名が漏れてないか確認して」
- `/comment-audit` (optionally followed by paths: `/comment-audit src/ plugins/`)
- "audit comments for leakage", "check comments for session-local narration"

The highest-value moment to run this is once, thoroughly, right before a
repository's first flip from private to public — anything already pushed to
a public remote is already exposed, so a pre-flip run is worth more than any
number of post-flip runs. After that, run it occasionally, the same cadence
as a periodic security audit.

Do NOT invoke when:

- The user wants per-diff / per-commit review — that's what the
  `ai-comment-check.mjs` hook already does, deterministically, on every
  commit.
- The user wants comments fixed, not just found — this skill is audit-only;
  remediation is a separate user decision.
- The user wants continuous in-session checking after every edit rather than
  a periodic full-corpus sweep.

## Workflow

### 1. Comment corpus collection

Run:

```sh
node "${CLAUDE_PLUGIN_ROOT}/skills/comment-audit/list-comments.mjs" [path-prefix ...]
```

This lists every comment-bearing line in tracked source files (same
extension/marker/exclusion rules as the hook) as `file:line: text`, one per
line. Pass explicit path prefixes if the user scoped the audit.

Unlike `security-audit`, there is **no risk-based scope-down** here —
comments are spread across the whole codebase, not concentrated in a few
high-risk paths, so this is inherently a full-corpus read.

**Cap and chunking**: if the total line count exceeds ~1200, split into
chunks of ~150 lines, keeping each file's lines together in one chunk
(never split a file across chunks). Record the chunk count in the report's
scope section — never silently drop a chunk.

### 2. Parallel fan-out — 3 axes × N chunks

For each chunk, launch 3 parallel Agent calls in a **single response**:
`subagent_type: comment-leak-scanner`, one per axis (A, B, C), passing the
axis letter and that chunk's lines. The agent has Read/Grep/Glob to pull
surrounding context for any line it's unsure about — axis definitions,
tool restrictions, and safety instructions live in the agent itself.

If a chunk/axis call returns non-JSON, label
`sub-agent-raw:<axis>-chunk<N>` and carry the prose forward — it bypasses
Steps 4–5.

### 3. Integrate

Merge all chunk × axis results into one findings list. Intra-axis dedupe by
`file + line + finding`. Unlike `security-audit`, do **not** implement a
cross-axis agreement bonus — these 3 axes are not independent confirmations
of the same defect class, so an A/B/C co-occurrence on the same line is not
meaningful corroborating evidence.

### 4. Confidence scoring

Same batching discipline as `security-audit`: ≤ 50 structured findings → one
`comment-audit-confidence-filter` call; > 50 → parallel chunks of 50 in
input order, concatenate in chunk order.

**Length check (mandatory)**: after concatenating, if
`len(scores) != len(findings)`, halt and report a confidence-filter
failure — do not proceed with misaligned scores.

### 5. Filter

Drop findings with score < 80. `sub-agent-raw:*` entries are not scored and
not filtered.

**Report status**:
- ≥ 1 finding after filter OR ≥ 1 raw entry → **findings**: report normally.
- 0 findings, 0 raw, 0 failed → **clean**.
- 0 findings, 0 raw, ≥ 1 failed → **incomplete**: do not interpret as clean;
  re-run after investigating the failure.

### 6. Write report file

Path: `tmp/comment-audit-<YYYY-MM-DD>.md` (workspace `tmp/`, not OS `/tmp`;
confirm it is gitignored before writing — never let this report get
committed, since axis-A findings quote the leaking text verbatim).
`mkdir -p tmp/` if missing. Overwrite any existing file at the same path.

**Report structure**: skeleton lives in `report-template.md`, a sibling of
this file. Axis-A findings are always listed first, regardless of their
exact score relative to B/C findings. Always written in Japanese.

After writing, reply in Japanese with: report path, before/after counts, and
the single axis-A finding as a 1-line callout if any survived the filter
(otherwise the single worst finding overall).

## Critical rules

- **Full-corpus, not risk-scoped.** This skill's cost model differs from
  `security-audit` — there is no grep-based scope-down substrate to share
  across sub-agents.
- **Axis A is reported first**, but is scored by the same 80-point threshold
  as B/C — importance changes ordering, not the bar for inclusion.
- **Quoting the leaking text is expected and required** in a finding — the
  quoted comment IS the evidence, unlike a security audit's secret-value
  rule. This is exactly why the report must stay under the gitignored
  `tmp/` path and never be committed.
- **No cross-axis bonus.** A/B/C are not independent confirmations of one
  defect.
- **Audit only — no remediation.** Do not edit any comment, even when a fix
  is obvious.
- **Parallel, not sequential**, within Step 2 — one response, 3 Agent uses
  per chunk.

## Anti-patterns

- ❌ Running this every commit or every session. It's periodic and
  thorough, not a hook — that role is `ai-comment-check.mjs`.
- ❌ Reusing `security-audit`'s grep-based scope-down. Comments aren't
  concentrated in risk paths; this is a full sweep by design.
- ❌ Treating axis B/C findings as equally actionable as axis A. Expect more
  noise there; A is the load-bearing reason this skill exists.
- ❌ Redacting the quoted comment text in the report. The text itself is the
  finding — redacting it defeats the report's purpose.
- ❌ Auto-fixing flagged comments. Audit, not remediation.
- ❌ Adding a cross-axis agreement bonus, unlike `security-audit`'s model —
  it doesn't apply here.
- ❌ Naming a specific other repository or project anywhere in this skill's
  own files, even as illustrative example text.
