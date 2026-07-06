---
name: pre-commit-code-review
description: >
  Commit-time lightweight review — dispatch the code-reviewer-sonnet agent
  against the uncommitted/staged diff. High-frequency / low-latency layer
  for a single commit's worth of change. Soft-auto: run this as the review
  step of the standard test -> implement -> review -> commit pipeline,
  before each commit. Trigger phrases — "pre-commit code review", "commit
  前のレビュー", "軽くレビューして", "look over", "/pre-commit-code-review".
allowed-tools: Agent, Bash
---

## Purpose

Pre-commit lightweight review. Dispatch the `code-reviewer-sonnet` agent against the uncommitted/staged diff. All review logic (observation points, output contract, project review docs) lives in that agent — this skill only gathers scope and reports the result.

## When to invoke

**Soft-auto**: before every commit in the standard test -> implement -> review -> commit pipeline, run this against the currently staged/uncommitted diff.

**Explicit triggers**: 「commit 前のレビュー」「軽くレビューして」「look over」「pre-commit code review」「/pre-commit-code-review」.

## Workflow

1. **Capture scope**: `git diff` + `git diff --staged`, capped at 500 lines / 50 KB. Restrict to a path argument if given; never expand to the whole branch. If the cap is exceeded, review what fits within it and flag the overage in the report rather than blocking. If both diffs are empty, fall back to `git show HEAD`; if there are no commits at all, stop.
2. **Gather intent**: `git log -1 --pretty=%B` plus a 2–3 line summary of what the parent session was trying to accomplish.
3. **Dispatch**: one `Agent` call, `subagent_type: code-reviewer-sonnet`. Pass the diff, the intent summary, and a finding cap of 3. The agent checks for project review docs itself.
4. **Report**: reply in Japanese with the agent's output verbatim (`PASS` or up to 3 findings). If step 1 fell back to `HEAD`, prepend `(working tree clean — reviewing HEAD: <subject>)`.

## Anti-patterns

| ❌ | ✅ |
|---|---|
| Expanding scope to the whole branch when the diff is small or empty | Fall back to `HEAD` only — never branch-wide. Whole-branch review is a separate, merge-time concern. |
| Silently reviewing HEAD without surfacing the fallback | Prepend the `(working tree clean — reviewing HEAD: ...)` note. |
| Editorializing or applying fixes | Report only. The parent session decides. |
| Blocking on the diff-size cap | Review what fits, flag the overage, keep going. |
| Reading project review docs in this skill instead of letting the agent do it | Pass only the diff, intent, and cap — the agent looks for docs itself. |
