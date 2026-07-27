---
name: issue-triage
description: >
  Turns the high-confidence findings from `security-audit`, `comment-audit`,
  or `project-audit` into GitHub issues. Verifies each finding against the
  live repo, dedupes against currently open issues via a batched
  `issue-duplicate-checker` (haiku) sub-agent, then presents ONE
  approval-gated plan (new issues + comments on existing issues + any
  labels that would need creating) and waits for explicit go-ahead before
  calling `gh issue create` / `gh issue comment` / `gh label create`.
  Trigger phrases — "issue化して", "監査結果をissueにして", "issueにして",
  "この監査結果からissueを作って", "/issue-triage", "file issues from the
  audit report", "turn these findings into github issues". Do NOT use
  without an existing audit report or findings already in hand (run
  `/security-audit`, `/comment-audit`, or `/project-audit` first), and
  never use this skill to edit code — it only files issues.
allowed-tools: Agent, AskUserQuestion, Bash, Read, Write
---

## Purpose

A single, source-agnostic pipeline from "audit findings" to "tracked
GitHub issues". This skill adds no findings of its own — detection and
confidence-filtering belong to `security-audit`, `comment-audit`, and
`project-audit`. This skill only verifies, dedupes, and files.

## When to invoke

- 「issue化して」「監査結果をissueにして」「issueにして」
  「この監査結果からissueを作って」
- `/issue-triage` (optionally naming a specific report path)
- "file issues from the audit report", "turn these findings into github issues"

Do NOT invoke when:

- No audit has been run yet and no findings/report exist — run
  `/security-audit`, `/comment-audit`, or `/project-audit` first.
- The user wants the underlying problem fixed, not tracked — this skill
  files issues, it never edits code or docs.

## Input

Either:
- An explicit report path the user names (`tmp/security-audit-2026-07-06.md`,
  etc.), or
- The most recently written `tmp/{security,comment,project}-audit-*.md` in
  the working repo, or
- Findings already present in this conversation because an audit skill was
  just run.

If none of these exist, stop and tell the user to run an audit skill
first — do not invent findings.

## Workflow

### 0. Preflight

Run these checks before touching any findings:

- `gh auth status` — must be logged in with issue/label write access.
- `git remote -v` — resolve the `origin` repo (`owner/name`).
- `gh repo view <owner>/<repo> --json visibility,hasIssuesEnabled`.

Gates:
- `hasIssuesEnabled = false` → stop; tell the user issues are disabled on
  this repo.
- No `origin` / not a git repo → stop.
- **Visibility guard**: if `visibility` is `PUBLIC` and any input finding
  originates from `security-audit` or `comment-audit` (not `project-audit`
  alone), stop and confirm with the user before proceeding — those two
  audits' findings can include exploit-relevant detail or, for
  `comment-audit` axis A, the literal leaking text as a quote. Filing that
  verbatim into a public issue tracker is a second, separate exposure on
  top of whatever the audit already found. Default = do NOT proceed
  without explicit approval.

### 1. Normalize

Read the input findings (from the report file's "高信頼度の finding"
section, or from context) into one common draft schema:

```json
{"source":"security|comment|project","severity":"high|medium|low","file":"path","line":123,"finding":"short title","reasoning":"why","quote":"optional, comment-audit only"}
```

`severity` derivation (see `labels.md` for the full table):
- `security-audit` / `project-audit` findings already carry `severity` —
  use it as-is.
- `comment-audit` findings carry `axis` instead — map axis A → `high`,
  axis B → `medium`, axis C → `low`.

Do NOT re-run confidence filtering here — each audit skill's own filter
(≥ 80) already gates what counts as "high-confidence".

### 2. Verify

For each draft with a real `file:line` (skip file-level drafts with
`line: 0`), Read the current file around that line to confirm the
condition described still holds. An audit report is a per-date snapshot;
code may have changed since. Drop any draft whose evidence no longer
matches current content, and record the drop count for the final summary
— never silently discard without accounting for it.

### 3. Duplicate check

- `gh issue list --state open --json number,title,body,labels,url --limit 200`.
- Batch the surviving drafts (post-Step-2) against this open-issue list
  through `issue-duplicate-checker` (haiku): ≤ 50 drafts → one call; > 50
  → parallel chunks of 50 in input order, concatenate in chunk order.
- **Length check (mandatory)**: after concatenating, if the result count
  doesn't match the draft count, halt and report a duplicate-check
  failure — do not proceed with misaligned results.

### 4. Plan and approval (single gate)

Partition drafts into:
- **New** — no match found. Will become a new `gh issue create`.
- **Update** — matched an open issue. Will become a `gh issue comment` with
  a short addendum (not a full re-post of the body): file:line, one-line
  summary, source.

Determine which labels from `labels.md` don't yet exist in the repo
(`gh label list`) among the ones the New drafts would need.

Present ONE plan, then use `AskUserQuestion` (or an explicit stop-and-wait)
for a single go/no-go:
- N new issues (title + source/severity labels + filled body for each).
- M comments on existing issues (target issue # + addendum text for each).
- K labels that would be created if approved.

This is the only execution gate — do not re-confirm the Step-0 visibility
guard's decision here if it was already approved, and do not ask
per-issue; one plan, one approval. If the user wants to drop or adjust
specific items, honor that, then re-confirm before Step 5.

### 5. Execute (only after approval)

**Template resolution** (in this order):
1. If `.github/ISSUE_TEMPLATE/*.md` (front-matter Markdown templates)
   exists in the target repo, use `gh issue create --template <name>`,
   picking the template whose `about`/`name` best matches a general
   bug/improvement report; note which one was used in the final summary.
2. If `.github/ISSUE_TEMPLATE/` contains only `.yml` issue forms (no
   plain `.md` template), do NOT attempt to fill a form programmatically —
   fall back to this skill's own `issue-template.md`.
3. Otherwise, use this skill's own `issue-template.md` (sibling of this
   file).

For a `comment-audit`-sourced draft with a `quote`, append an extra
`## 引用` section (`> <quote>`) after the template's own sections,
regardless of which template was used.

Steps, in order:
1. Create any missing labels from the approved plan (idempotent):
   `gh label create "<name>" --color <hex> --force`.
2. For each **New** draft: `gh issue create --title "[<source label>] <finding>" --label <source> --label "severity:<severity>" --body "$(cat <<'EOF' ... EOF)"` (quoted heredoc so markdown/backticks in the body stay literal).
3. For each **Update** draft: `gh issue comment <issue#> --body "..."`.
4. After all creates/comments, list results (`gh issue list --state open`
   filtered to what was just touched) and report each issue's number, URL,
   title, and action taken (created/commented) to the user in Japanese.

## Critical rules

- **Audit + file only — never edit code or docs.** Remediation is a
  separate, explicit user decision.
- **One approval gate, mandatory.** Filing issues/comments/labels is a
  visible action on shared state. Never call `gh issue create`,
  `gh issue comment`, or `gh label create` before Step 4's explicit
  go-ahead.
- **Visibility guard for security/comment-sourced findings on public
  repos.** Get separate, explicit confirmation for this at Step 0 before
  even building the plan.
- **Dedupe — one draft, one action.** Never both comment on an existing
  issue AND create a new one for the same draft.
- **No secret values** in any title or body, inherited from
  `security-audit`'s own rule — location only.
- **Self-contained bodies.** Never reference the local `tmp/*.md` report
  path as if it were readable from the issue — it isn't on GitHub.
- **Labels are fixed to `labels.md`.** Never invent a new label beyond
  that list; never overwrite an existing label's color.
- **YAML issue forms are not fillable here.** If only `.yml` templates
  exist, fall back to the bundled template rather than guessing at a
  form's structure.

## Anti-patterns

- ❌ Filing issues/comments/labels without presenting the plan and
  getting approval first.
- ❌ Re-running confidence filtering — that already happened in the audit
  skill; this skill only verifies drift and dedupes.
- ❌ Filing two issues, or an issue and a comment, for the same draft.
- ❌ Skipping the visibility guard because "it's just one issue".
- ❌ Referencing the local `tmp/*.md` report as the issue's source of
  record.
- ❌ Attempting to programmatically fill a YAML-based issue form.
- ❌ Creating a label not listed in `labels.md`, or changing an existing
  label's color.
- ❌ Treating a `project-audit`-sourced finding as needing the same
  visibility guard as security/comment — it doesn't carry the same
  exposure risk.
