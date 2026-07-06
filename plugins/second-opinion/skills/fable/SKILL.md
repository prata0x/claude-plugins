---
name: fable
description: >
  Manually escalate a hard investigation, root-cause analysis, or
  solution-design task to Claude's Fable tier for its judgment only.
  Context-gathering runs on the default model; Fable is consulted exactly
  once for the hard part; any follow-up action (writing a file, posting a
  comment, etc.) is performed by the default model afterward, and only if
  explicitly requested in the command text. Usage — `/fable <task>`, e.g.
  "/fable issue #12 の解決案を出して、コメントを書いて" or "/fable
  ◯◯のボトルネックを調査して". Never auto-invoked — this skill only runs
  on explicit `/fable`.
disable-model-invocation: true
allowed-tools: Agent, Bash, Read, Grep, Glob, Write, WebFetch, WebSearch
---

## Purpose

Delegate the single hardest part of an arbitrary task — investigation,
root-cause analysis, or solution design — to Claude's Fable tier, while
everything else (gathering context, and any explicitly-requested
follow-up action) runs on the default model. Fable is consulted exactly
once per invocation; this skill never fans out multiple Fable calls.

## When to invoke

Only when the user explicitly types `/fable <task>`. This skill has
`disable-model-invocation: true` — never invoke it based on your own
judgment that a task looks hard.

## Input

`$ARGUMENTS` is the task in free-form text. It may name a concrete target
(an issue number, a file, a symptom) or be a bare question. It may also
name a follow-up action to perform after Fable answers (e.g. "...コメン
トを書いて", "...まとめてdocsに書いて").

## Workflow

### 1. Gather context (default model, judgment call)

Collect only what's needed to state the task precisely — no more:

- If the task names an issue/PR, `gh issue view` / `gh pr view` it.
- If it names a file, symptom, or code area, `Read`/`Grep` the relevant
  parts.
- If it's an open investigation question with no obvious local target,
  search/read whatever the question requires.

Do not attempt to solve the task yourself here — gather, don't analyze.

### 2. Consult Fable (exactly once)

Dispatch `Agent` with `subagent_type: fable-advisor`, passing the task
text verbatim plus everything gathered in step 1. Do not paraphrase the
task away — Fable should see the user's actual wording.

### 3. Present

Report Fable's answer to the user in Japanese. Summarize; don't paste
raw output if long.

### 4. Follow-up (only if explicitly named)

If `$ARGUMENTS` explicitly named an action (a comment to write, a file to
update), perform exactly that one action using Fable's answer as the
content. If no action was named, stop after step 3 — do not infer one.

## Critical rules

- **Exactly one Fable call per invocation.** Fable is expensive; never
  fan out multiple calls or retry on a "model not found" error — report
  it and stop. There is no fallback to a different model, since that
  would defeat the point of naming Fable specifically.
- **No implicit follow-up.** Only perform an action explicitly named in
  `$ARGUMENTS`. Investigation-only questions get a report, nothing else.
- **Fable is an advisor, not an executor.** `fable-advisor` cannot write
  files; all mutation happens in step 4, on the default model, under your
  own judgment about what the user actually asked for.

## Anti-patterns

| ❌ | ✅ |
|---|---|
| Auto-invoking this because a task looks hard | Only run on explicit `/fable`. |
| Doing the analysis yourself before calling Fable | Gather context only; let Fable do the reasoning. |
| Calling `fable-advisor` more than once | One call per invocation. |
| Posting a comment / editing a file with no explicit request | Only act on a follow-up named in `$ARGUMENTS`. |
| Silently falling back to another model if Fable is unavailable | Report the failure; do not substitute a different model. |
