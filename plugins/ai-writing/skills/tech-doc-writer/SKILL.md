---
name: tech-doc-writer
description: >
  Drafting guidance for technical documents (README, design docs, reports,
  postmortems): direct, substantive prose — an actual stance, concrete
  specifics, varied rhythm — with a built-in check against generic,
  hedge-heavy AI-generated-prose patterns. Not about persona or humor.
  Trigger phrases — "技術文書を書いて", "READMEを書いて",
  "レポートにまとめて", "設計ドキュメントを書いて", "write a technical doc",
  "write up this design", "draft a report on this". Do NOT use for
  authoring SKILL.md/CLAUDE.md/agent instruction files — those follow this
  repo's own terse, bulleted decision-logic convention, which is the
  opposite of what this skill optimizes for. Do NOT use when the user
  wants a blog-style article with a first-person, personality-driven
  voice. Do NOT use for a commit message, PR description, issue body, or
  review comment — those target a reader who is about to read the diff
  anyway, which is a different failure mode (restating the diff) than
  technical-document prose.
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

## Purpose

Good technical prose (README, design docs, postmortems) commits to
specific, checkable claims — real numbers, an actual stance the writer
could be wrong about — instead of hedging in general statements that
would be equally true of any project. That same gap, absence of a
writer's actual stance, is also the main way AI-generated technical
writing gives itself away, so closing it serves both goals at once:
better prose, and prose that doesn't read as generated. Fixing surface
phrase tics without fixing that is cosmetic.

This skill is deliberately not about adding personality — a technical
document should stay direct and register-appropriate. The fix is
substance: specific claims, real numbers, an actual stance the writer
could be wrong about.

## Core test before writing a sentence

**Could this sentence appear unchanged in a write-up of a completely
different project?** If yes, it's not saying anything — replace it with a
concrete detail (a number, a file path, a specific tradeoff you actually
weighed) or cut it.

## Rules

- **Commit to a claim.** Write "this doubles p99 latency under concurrent
  writes" not "this may impact performance in some cases." A claim you
  could be wrong about is more useful than a hedge that's always safe.
- **Cite the specific thing**, not the category. "The retry loop in
  `worker.go:142` masked the underlying timeout" beats "there was an
  issue with error handling."
- **Vary sentence and paragraph shape.** Do not force every section into
  the same topic-sentence-plus-three-bullets template — that rhythm
  itself reads as AI-generated regardless of content, per the research
  this skill is based on.
- **Use lists only where the content is actually list-shaped** (options
  to compare, ordered steps). Narrative/explanatory content — why a
  decision was made, what went wrong and why — reads better as connected
  prose.
- **Cut formulaic openers/closers.** No "This document explains...", no
  "In conclusion...", no "I hope this is helpful." Start with the
  content; stop when the content is done.
- **Avoid known AI-tell fixed phrases** (と言えるでしょう, ではないでしょうか,
  と言っても過言ではありません, これにより, 本稿では〜を解説します,
  この記事では〜を解説します, いかがでしたか, 参考になれば幸いです,
  今後の動向に注目, ぜひ試してみて/活用してください, もちろんです！,
  非常に重要です, 極めて重要な意味を持ちます) — but avoiding this list
  is not sufficient on its own; it only catches the shallowest layer. The
  writer test above is the real bar.

## Anti-patterns

| ❌ | ✅ |
|---|---|
| "This may improve performance in certain scenarios" | "This cuts p99 by ~40% under the write-heavy benchmark" |
| Every section shaped as intro sentence + 3 bullets + summary line | Vary structure by what the section actually needs to say |
| A confident-sounding claim with no way to check it | A claim tied to a file, metric, or reproducible observation |
| Adding jokes/persona to sound less AI-generated | Fix substance instead — persona isn't the fix for technical prose |
| Treating "no known AI-tell phrases present" as "done" | That list only catches the shallowest layer; the writer test above is the real bar |
