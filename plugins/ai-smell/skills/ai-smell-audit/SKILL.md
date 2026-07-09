---
name: ai-smell-audit
description: >
  Occasional, thorough project-wide audit for AI臭 (AI-generated-text smell)
  in prose documents, covering what fixed-phrase pattern matching
  structurally cannot catch: absence of a writer's actual stance (axis A —
  highest priority, per research the root cause behind surface-level
  phrase tics), structural/rhythm monotony (axis B), and formulaic
  paraphrases of known AI-tell phrases (axis C). Uses parallel
  ai-smell-scanner (opus) sub-agents per axis/document and an
  ai-smell-confidence-filter (haiku) confidence filter, writing a report
  to tmp/ai-smell-audit-<date>.md. Trigger phrases — "AI臭監査して",
  "書き手の不在チェックして", "AI臭がないか確認して", "文章のAIっぽさをチェックして",
  "/ai-smell-audit", "audit for AI writing smell", "check these docs for
  AI slop". Do NOT use for per-edit checking or for continuous in-session
  checks after each write.
allowed-tools: Agent, Bash, Read, Write
---

## Purpose

Project-wide audit of prose documents (articles, README, reports — NOT
Claude Code instruction files) for 3 categories that fixed-phrase pattern
matching structurally cannot catch, because each needs document-level or
open-vocabulary judgment rather than matching against a known phrase
list:

- **Axis A — absence of a writer (書き手の不在)** (highest priority).
  Research on this consistently points to this as the actual root cause
  of AI臭, not any single phrase: the document reads as safe, hedge-heavy,
  and generic — nothing in it required the writer to commit to a specific,
  falsifiable claim. Surface fixes (removing stock phrases) don't reach
  this.
- **Axis B — structural / rhythm monotony**. Every paragraph the same
  shape, sentence length showing no variation, bullet lists used where
  connected prose would read more naturally to a human audience. Lower
  priority than A — this is a symptom, not the root cause, but it's a
  reliably-cited modern tell (more so than vocabulary-level tics, per the
  research this skill is based on).
- **Axis C — formulaic paraphrase**. An opener/closer/transition that
  performs the same function as a dictionary-caught phrase but is worded
  differently enough to evade the regex. Highest false-positive risk of
  the three — a genuine, specific sentence that happens to share a word
  with a stock phrase is not a paraphrase of it.

This is Claude-led semantic judgment, not deterministic pattern matching —
it can miss things or produce false positives and is not a save-time
gate. Output is a written report only; no in-session edits.

## When to invoke

- 「AI臭監査して」「書き手の不在チェックして」「文章のAIっぽさを確認して」
- `/ai-smell-audit` (optionally followed by paths: `/ai-smell-audit docs/ README.md`)
- "audit for AI writing smell", "check these docs for AI slop"

Run this after drafting a batch of documents/articles, or periodically
alongside other project audits — not after every single edit.

Do NOT invoke when:

- The user wants per-edit / per-write checking, done deterministically on
  every save — this skill is for periodic, thorough sweeps instead.
- The user wants the prose fixed, not just found — this skill is
  audit-only; remediation is a separate user decision.
- The target is a Claude Code instruction file (SKILL.md, CLAUDE.md,
  AGENTS.md, anything under `.claude/skills/`, `.claude/agents/`,
  `.claude/rules/`, or this repo's own plugin-dev layout
  `plugins/<name>/skills/`/`plugins/<name>/agents/`) — those are
  deliberately terse and bulleted by convention; this audit's axes don't
  apply.

## Workflow

### 1. Document corpus collection

Run:

```sh
node "${CLAUDE_PLUGIN_ROOT}/skills/ai-smell-audit/list-docs.mjs" [path-prefix ...]
```

This lists every in-scope `*.md` file path, excluding Claude Code
instruction files. Pass explicit path prefixes if the user scoped the
audit.

**Cap and chunking**: each document is judged as a whole, not chunked by
line (axis A/B require document-level context). If the corpus exceeds ~15
documents, batch them into audit rounds of ~15 rather than fanning out
unbounded parallel agents in one response; record the round count in the
report's scope section.

### 2. Parallel fan-out — 3 axes × N documents

For each document, launch 3 parallel Agent calls in a **single response**:
`subagent_type: ai-smell-scanner`, one per axis (A, B, C), passing the
axis letter and the file path. The agent reads the full document itself
via Read — axis definitions, tool restrictions, and the dictionary
exclusion list live in the agent itself.

If a document/axis call returns non-JSON, label
`sub-agent-raw:<axis>-<file>` and carry the prose forward — it bypasses
Steps 4–5.

### 3. Integrate

Merge all document × axis results into one findings list. Intra-axis
dedupe by `file + location + finding`. Do **not** implement a cross-axis
agreement bonus — these 3 axes are not independent confirmations of the
same defect class.

### 4. Confidence scoring

Batch findings for confidence scoring: ≤ 50 structured findings → one
`ai-smell-confidence-filter` call; > 50 → parallel chunks of 50 in input
order, concatenate in chunk order.

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

Path: `tmp/ai-smell-audit-<YYYY-MM-DD>.md` (workspace `tmp/`, not OS
`/tmp`; confirm it is gitignored before writing). `mkdir -p tmp/` if
missing. Overwrite any existing file at the same path.

**Report structure**: skeleton lives in `report-template.md`, a sibling of
this file. Axis-A findings are always listed first, regardless of their
exact score relative to B/C findings. Always written in Japanese.

After writing, reply in Japanese with: report path, before/after counts,
and the single axis-A finding as a 1-line callout if any survived the
filter (otherwise the single worst finding overall).

## Critical rules

- **Document-level, not line-level.** Axis A and B require reading the
  whole document — never judge from an isolated paragraph.
- **Excludes Claude Code instruction files.** SKILL.md/CLAUDE.md/AGENTS.md,
  anything under `.claude/skills/`, `.claude/agents/`, or `.claude/rules/`,
  and this repo's own `plugins/<name>/skills/`/`plugins/<name>/agents/`
  are terse-by-design; this audit's axes would produce false positives
  there.
- **Axis A is reported first**, but is scored by the same 80-point
  threshold as B/C — importance changes ordering, not the bar for
  inclusion.
- **Quoting the offending text is expected and required** in a finding —
  it IS the evidence.
- **No cross-axis bonus.** A/B/C are not independent confirmations of one
  defect.
- **Audit only — no remediation.** Do not edit any document, even when a
  fix is obvious.
- **Parallel, not sequential**, within Step 2 — one response, 3 Agent uses
  per document.

## Anti-patterns

- ❌ Running this every save. It's periodic and thorough — not meant for
  continuous per-edit checking.
- ❌ Auditing SKILL.md/CLAUDE.md/agent instruction files against these
  axes. They follow a different, deliberately terse convention.
- ❌ Judging axis A/B from a single paragraph instead of the whole
  document.
- ❌ Treating axis B/C findings as equally load-bearing as axis A. Expect
  more noise there; A is the reason this skill exists.
- ❌ Redacting the quoted text in the report. The text itself is the
  finding.
- ❌ Auto-fixing flagged documents. Audit, not remediation.
