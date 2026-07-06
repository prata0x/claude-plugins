---
name: pre-merge-code-review
description: >
  Final review before merge — dispatches code-reviewer-opus (correctness)
  and ai-agent-security-checker (security anti-patterns) in parallel
  against the cumulative branch-vs-base diff. Low-frequency / high-stakes
  layer: the last check before an autonomous merge with no human PR review
  gate. Soft-auto: run this right after opening the PR, in parallel with
  CI rather than waiting for it, on every PR. The correctness pass skips
  on a single-commit branch (already covered by the per-commit review
  step); the security pass always runs — nothing else in the standard
  pipeline covers it. If a new commit lands after this review and before
  merge, re-run before merging. Trigger phrases — "merge 前にレビュー",
  "PR をレビューして", "pre-merge code review", "final review before
  merge", "/pre-merge-code-review".
allowed-tools: Agent, Bash
---

## Purpose

Final review of the whole unit of work, once per PR, before merging. Dispatch `code-reviewer-opus` (correctness) and `ai-agent-security-checker` (security anti-patterns) against the cumulative diff since the branch diverged from its base. All review logic lives in those agents — this skill only gathers scope and reports the result.

## When to invoke

**Soft-auto**: run this right after opening the PR — in parallel with CI rather than waiting for it, since CI runs in the background regardless and review doesn't depend on its result. Run on every PR; commit count only affects which agents get dispatched (see Workflow), never whether the skill runs at all. If a new commit lands after this review and before the actual merge (e.g. a CI-failure fix-up), re-run this skill against the updated diff — never merge a diff that differs from what was last reviewed.

**Explicit triggers**: 「merge 前にレビュー」「PR をレビューして」「pre-merge code review」「final review before merge」「/pre-merge-code-review」.

## Workflow

1. **Determine scope**: `git merge-base <base> HEAD`, then `git diff <merge-base>...HEAD`. No hard cap — if it is unreasonably large (thousands of lines), review it anyway and flag the size in the report (e.g. `(large diff — N files / M lines; consider splitting PRs this size in the future)`) rather than truncating silently or blocking.
2. **Gather intent**: `gh pr view --json title,body` if a PR already exists, otherwise the commit messages since the merge-base.
3. **Count commits** since the merge-base — this decides whether the correctness pass runs (step 4).
4. **Dispatch, in a single response**:
   - `subagent_type: ai-agent-security-checker` — always. Pass the cumulative diff, the intent, no finding cap.
   - `subagent_type: code-reviewer-opus` — only if commit count is 2+ (redundant with the per-commit review on a single-commit branch; state the skip and why). Pass the cumulative diff, the intent, no finding cap, and one extra instruction: "This branch has N commits — also flag any inconsistency between changes made in different commits (e.g. a helper added in one commit whose callers weren't updated in another)." The agent checks for project review docs itself.
5. **Report**: reply in Japanese with both agents' output verbatim, labeled by which reviewed what (correctness / security). Do not merge if either produced a Critical or High finding — report it clearly, leave the PR unmerged, and end here rather than completing the merge automatically.

## Anti-patterns

| ❌ | ✅ |
|---|---|
| Skipping the whole skill on a single-commit PR | Only the correctness pass skips there; the security pass always runs. |
| Reviewing only the last commit instead of the cumulative diff | Always diff against the merge-base, not `HEAD~1`. |
| Merging past a Critical/High finding from either agent automatically | Stop, report it, leave the PR unmerged. Merging through a real finding defeats the point of the gate. |
| Truncating a large diff silently | Review it anyway and flag the size instead. |
| Reading project review docs in this skill instead of letting `code-reviewer-opus` do it | Pass only the diff, intent, and instructions — the agent looks for docs itself. |
| Merging on a diff that changed since the last review (e.g. a CI-failure fix-up commit landed after) | Re-run this skill against the updated diff before merging. |
