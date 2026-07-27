---
name: adversarial-review
description: >
  Deep, skeptical review of a diff range for moments needing more scrutiny
  than the global `reviewer` subagent alone — e.g. before a deploy, before
  a large or risky merge. Runs 3 parallel `diff-review-scanner` agents,
  each a distinct lens (correctness & regressions / design &
  maintainability / test coverage), then a `diff-review-confidence-filter`
  to score and drop noise. The diff range is always supplied by the
  caller — this skill does not infer scope on its own. Trigger phrases —
  "敵対的レビューして", "念入りにレビューして", "デプロイ前にレビューして",
  "/adversarial-review <range>", "adversarial review of <range>",
  "thorough review before deploy".
allowed-tools: Agent, Bash
---

## Purpose

A deeper, multi-lens review than the global `reviewer` subagent's single pass — for a caller-specified diff range, not a fixed "since branch base" or "since last deploy" rule. The calling session decides what range matters (e.g. `<last-deploy-ref>..HEAD`, `main...HEAD`, an explicit commit range) and supplies it explicitly.

## When to invoke

Invoke when explicitly asked, or when the calling session judges a diff warrants more scrutiny than a single reviewer pass — a pre-deploy check, a large accumulated diff, or a change in a security- or data-sensitive area. This skill does not run automatically; it needs an explicit diff range from the caller.

Do NOT invoke when:

- No range is available — ask the caller to supply one (e.g. a ref, a commit range, or explicit paths) rather than guessing scope.
- The change is small and routine — the global `reviewer` subagent already covers that case.
- The user wants project-wide security scanning — that's `security-audit`, not this skill.

## Workflow

1. **Resolve scope**: take the diff range as given (e.g. `git diff <range>`). Never expand or narrow it on your own judgment — if the range looks unusually large, review it anyway and flag the size in the report rather than truncating silently.
2. **Gather intent**: `git log <range> --oneline` (or the caller's own one-line description if no range resolves to commits) to summarize what the diff is meant to do.
3. **Dispatch, in a single response**: 3 parallel `Agent` calls, `subagent_type: diff-review-scanner`, one per axis (A: correctness & regressions, B: design & maintainability, C: test coverage), each passed the full diff and the intent summary.
4. **Integrate**: merge the 3 axis results into one findings list. Same-`file` + `line ±3` flagged by 2+ axes → mark `cross_axis: true` (independent agreement across distinct lenses is stronger evidence). Intra-axis dedupe by `file + line + finding`.
5. **Confidence scoring**: pass the merged findings (without `cross_axis`, to keep the filter unbiased) to `diff-review-confidence-filter` — one call if ≤ 50 findings, parallel chunks of 50 in input order if more, then concatenate scores in chunk order. **Length check (mandatory)**: if the returned score count doesn't match the finding count, halt and report a confidence-filter failure rather than proceeding with misaligned scores.
6. **Apply cross-axis bonus**: for each `cross_axis: true` finding, add 10 to its score (cap 100) — applied by you after the filter returns, not by the filter itself.
7. **Filter**: drop findings scoring < 80. `sub-agent-raw:<axis>` entries (non-JSON scanner output) are not scored and not filtered — carry them forward verbatim.
8. **Report**: reply with the surviving findings ordered by severity, each labeled by axis, plus any raw/unparseable axis output. If nothing survives, state that plainly rather than padding with weak findings.

## Critical rules

- **The caller supplies scope.** This skill never invents a diff range — ask rather than guess if none was given.
- **Parallel, not sequential** in Step 3 — one response, 3 `Agent` uses.
- **The confidence filter does not see `cross_axis`.** Apply the bonus yourself after it returns.
- **Audit only — no remediation.** Report findings; the calling session decides what to fix and when.
- **No retries on scanner failure.** If an axis times out or returns garbage, mark it raw/failed and proceed with the rest.

## Anti-patterns

| ❌ | ✅ |
|---|---|
| Inferring "since last deploy" or "since branch base" on your own | Take the range the caller gives; ask if none was supplied. |
| Running the 3 scanner axes sequentially | One response, 3 parallel `Agent` calls. |
| Letting the confidence filter see `cross_axis` | Apply the +10 bonus yourself, after scoring. |
| Truncating a large diff silently | Review it anyway; flag the size in the report. |
| Treating this as a substitute for `security-audit` | This is diff-scoped correctness/design/test review, not a security sweep. |
| Auto-fixing a finding | Report only. The calling session decides. |
