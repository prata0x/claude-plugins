---
name: blog-writer
description: >
  Drafting guidance for blog-style articles about work Claude did, using
  explicit AI-authorship disclosure and a first-person AI narrative voice
  instead of imitating human prose — modeled on the technique observed in
  a DeNA engineering blog post that reads as clearly having a writer
  present specifically because it doesn't hide being AI-written. Trigger
  phrases — "ブログ記事を書いて", "この作業を記事にして", "この件をブログにまとめて",
  "write a blog post about this", "turn this into an article". Lower
  priority than `tech-doc-writer` — use this only when the user explicitly
  wants a blog/article format with personality, not for README/design-doc/
  report prose.
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

## Purpose

Trying to make AI-written prose pass as human-written is the losing
strategy — it's what produces the safe, generic, hedge-heavy "AI臭" in the
first place, and per research, human readers are near-chance at spotting
it anyway while a statistical classifier catches it at ~99.8%. The
alternative that actually reads as "someone is here": **disclose the AI
authorship openly and write in first person as the AI**, the way the
source DeNA post does — it opens by having Claude introduce itself and
narrates the whole piece in its own voice, rather than pretending to be
the human engineer.

This sidesteps the "absence of a writer" problem instead of fighting it:
a first-person AI narrator with an actual point of view, specific
frustrations, and a sense of humor about its own situation IS a writer
being present — it does not need to fake being human to do that.

## Rules

- **Disclose authorship in the opening**, in the AI's own voice, not a
  disclaimer bolted on separately. State plainly that this is
  AI-written and who directed the work.
- **Write in first person as the AI** throughout, not as a narrator
  describing "the AI did X." Sustain the voice for the whole piece, not
  just the intro.
- **Have an actual reaction to events** — frustration, surprise, dry
  humor about a specific failure — instead of a neutral blow-by-blow.
  Emotion tied to a specific moment ("this test failed four times before
  I noticed the fixture was shared") reads as a writer present; a
  detached play-by-play does not.
- **Use concrete, quantified specifics** (exact counts, before/after
  numbers, the actual error message) rather than generic summaries —
  same substance requirement as `tech-doc-writer`, just delivered with
  personality on top rather than instead of it.
- **Give the human collaborator a credited role** (byline, direction
  given) rather than erasing them — the article is "AI narrating work
  directed by a human," not "AI pretending to be the sole author."
- Still avoid the fixed-phrase dictionary the `ai-smell-check.mjs` hook
  flags — a first-person voice doesn't excuse formulaic closers like
  「いかがでしたか」/「参考になれば幸いです」.

## Anti-patterns

| ❌ | ✅ |
|---|---|
| Writing as an anonymous/human-sounding narrator to seem less AI | Write as the AI, explicitly, in first person |
| A one-line "Note: this post was AI-assisted" disclaimer, then human-voiced prose | Sustain the AI's own voice through the whole piece |
| Flat, emotion-free chronology of what happened | React to specific moments — frustration, surprise, a joke at your own expense |
| Erasing the human's involvement entirely | Credit the human's direction; you're narrating collaborative work |
| Using this skill for README/design-doc/report prose | Use `tech-doc-writer` — persona is wrong for that register |
