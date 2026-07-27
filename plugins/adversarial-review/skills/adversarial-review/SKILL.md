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

1. **Resolve scope**: take the diff range as given (e.g. `<ref>..HEAD`). Never expand or narrow it on your own judgment.
2. **Gather intent**: `git log <range> --oneline` (or the caller's own one-line description if no range resolves to commits) to summarize what the diff is meant to do.
3. **Dispatch, in a single response**: 3 parallel `Agent` calls, `subagent_type: diff-review-scanner`, one per axis (A: correctness & regressions, B: design & maintainability, C: test coverage), each passed the range (not the diff text — the scanner fetches it itself) and the intent summary.
4. **Partition results BEFORE parsing**, into three buckets:
   - **Parsed** — axis returned a valid JSON array matching the schema.
   - **Raw** — axis returned content that is not valid JSON. Label `sub-agent-raw:<axis>`; carry the prose forward verbatim (bypasses steps 5–7).
   - **Failed** — axis timed out, refused, or returned no content. Label `sub-agent-failed:<axis>` (bypasses steps 5–7; recorded for step 8's status).
5. **Integrate the Parsed bucket only**: intra-axis dedupe by `file + line + finding`. Axes A/B/C are disjoint by design (scanners are told not to cross-flag), so do not implement a cross-axis agreement bonus here — that mechanism only makes sense when axes can genuinely overlap on the same line, which these three do not. **The findings list from this step is FINAL** — no reorder, dedupe, addition, or modification between this point and step 6.
6. **Confidence scoring**: pass the findings list from Step 5 to `diff-review-confidence-filter` — one call if ≤ 50 findings, parallel chunks of 50 in input order if more, then concatenate scores in chunk order. **Length check (mandatory)**: if the returned score count doesn't match the finding count, halt and report a confidence-filter failure rather than proceeding with misaligned scores.
7. **Filter**: drop findings scoring < 75 (the rubric's own "high confidence, real impact" anchor — see the agent's rubric). Raw and Failed entries are not scored and not filtered.
8. **Report status**, then reply:
   - ≥ 1 finding after filter OR ≥ 1 raw entry → **findings**: report normally, ordered by severity, each labeled by axis, plus any raw axis output.
   - 0 findings, 0 raw, 0 failed → **clean**: state this plainly.
   - 0 findings, 0 raw, ≥ 1 failed → **incomplete**: state that the review could not complete — name which axes failed — and do NOT report this as clean. Re-run before treating the range as reviewed.

## Critical rules

- **The caller supplies scope.** This skill never invents a diff range — ask rather than guess if none was given.
- **Parallel, not sequential** in Step 3 — one response, 3 `Agent` uses.
- **No cross-axis bonus.** Unlike `security-audit`'s 8 overlapping axes, these 3 lenses are disjoint by construction; a same-line hit across axes would be a scanner failing to stay in its lane, not corroborating evidence.
- **A failed axis is never silently treated as clean.** Distinguish `incomplete` from `clean` — see Step 8.
- **Audit only — no remediation.** Report findings; the calling session decides what to fix and when.
- **No retries on scanner failure.** Mark it raw/failed and proceed with the rest.

## Anti-patterns

| ❌ | ✅ |
|---|---|
| Inferring "since last deploy" or "since branch base" on your own | Take the range the caller gives; ask if none was supplied. |
| Running the 3 scanner axes sequentially | One response, 3 parallel `Agent` calls. |
| Reporting a run as clean when an axis failed | Distinguish `incomplete` (a failure occurred) from `clean` (nothing found). |
| Adding a cross-axis bonus like `security-audit` | These 3 axes are disjoint by design — don't reuse a mechanism built for overlapping axes. |
| Reordering or modifying findings between Steps 5 and 6 | The list is final once integrated; only scores get attached. |
| Truncating a large diff silently | The scanner fetches and chunks its own reading; this skill never truncates on its behalf. |
| Treating this as a substitute for `security-audit` | This is diff-scoped correctness/design/test review, not a security sweep. |
| Auto-fixing a finding | Report only. The calling session decides. |
