---
name: article-review
description: Run the automated style and fact-check review pass on a drafted article (English or Japanese), auto-revise on findings, and loop until it passes or the retry budget is exhausted. Stage 3 (English) and stage 5 (Japanese) of the editorial pipeline (see ../../reference/pipeline-overview.md). Trigger phrases — "レビューして", "review this draft".
allowed-tools: Read, Edit, Grep, Glob, Agent
---

## What this checks

Two independent checks, dispatched in parallel via the Agent tool, against
one article file.

**Style** — `writing:ai-writing-scanner`, one call per axis (A, B, C),
each pointed at the article's file path. This reuses the same agent the
`writing` plugin's periodic audit uses, just scoped to one document
instead of a corpus. Then `writing:ai-writing-confidence-filter` on the
combined findings (single batch call — the article is one document,
findings won't exceed the 50-per-call batch size the confidence filter
expects). Drop anything scoring below 80, same threshold as the audit
skill.

Also grep the article for the persona's own NG-phrase list from
`PERSONA.md`, and for phrasing that already appears in this site's other
published posts (`content/posts/*.md` / `*.ja.md`, excluding the file
under review) — repetition across articles is a finding in its own right,
not something the scanner axes cover.

**Facts** — `blog-pipeline:fact-checker`, one call:

- English mode: `mode: external` — verifies technical claims against real
  sources.
- Japanese mode: `mode: fidelity` — verifies the translation against the
  approved English source; no external search.

## Loop

1. Dispatch the style scan (3 axes) + confidence filter + fact-checker in
   a single message (parallel Agent calls; the confidence filter needs
   the scan results first, so it's step 2 of the style side but still
   runs before waiting on fact-checker's result).
2. Both style (post-filter) and facts pass with no findings → report pass,
   stop.
3. Either has blocking findings → revise the article yourself (Edit tool)
   to address them, then re-dispatch both against the revised draft.
4. **Cap at 3 rounds.** Still failing after round 3 → stop, report the
   outstanding findings to the user verbatim, and wait for direction. Do
   not keep looping past the cap, and do not ship an article that never
   passed.
5. The reviewers' verdict is the gate, not your own judgment — if you
   think a finding is a false positive, say so to the user rather than
   silently overriding it.

## Output

Report which round it passed on (or that it hit the cap), and a one-line
summary of what was fixed if anything.

## Anti-patterns

| ❌ | ✅ |
|---|---|
| Judging the article "good enough" and skipping dispatch | Always dispatch both checks, even on a draft you're confident in |
| Looping past round 3 | Stop and report to the user at the cap |
| Overriding a finding you disagree with silently | Flag the disagreement to the user; don't unilaterally dismiss it |
| Re-running external fact-check in Japanese mode | Japanese mode is fidelity-only — the facts were cleared in English mode |
| Treating your own re-read as equivalent to dispatching the agents | The agents are the gate — always actually dispatch them |
