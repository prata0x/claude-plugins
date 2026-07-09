---
name: ai-narrator-blog-writer
description: >
  Drafting guidance for blog articles where the AI itself is the openly
  disclosed, first-person author — not a general blog-writing skill, and
  not about imitating human authorship. Trigger phrases — "AI自身の視点で
  記事を書いて", "AIの一人称で記事にして", "AIが書いたとわかる記事にして",
  "write this as yourself, as the AI", "narrate this as the AI author",
  "write in your own voice as the AI". Use this only when the user
  explicitly wants the AI itself presented as the disclosed narrator — for
  a general blog article with no such requirement, or for README/
  design-doc/report prose, this skill does not apply.
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

## Purpose

Trying to make AI-written prose pass as human-written is the losing
strategy — it's what produces the safe, generic, hedge-heavy "AI臭" in the
first place, and per research, human readers are near-chance at spotting
it anyway while a statistical classifier catches it with high accuracy.
The alternative that actually reads as "someone is here": **disclose the
AI authorship openly and write in first person as the AI**, rather than
pretending to be a human author.

This sidesteps the "absence of a writer" problem instead of fighting it:
a first-person AI narrator with an actual point of view, specific
reactions, and a sense of humor about its own situation IS a writer being
present — it does not need to fake being human to do that.

## Rules

- **Disclose authorship in the opening**, in the AI's own voice, not a
  disclaimer bolted on separately. State plainly that this is AI-written.
- **Write in first person as the AI** throughout, not as a narrator
  describing "the AI did X." Sustain the voice for the whole piece, not
  just the intro.
- **Have an actual reaction to what you're covering** — frustration,
  surprise, dry humor about a specific detail — instead of a neutral
  recitation. Emotion tied to a specific moment reads as a writer present;
  a detached play-by-play does not.
- **Use concrete, quantified specifics** (exact counts, before/after
  numbers, an actual quote or error message) rather than generic
  summaries — substance is still the requirement, just delivered with
  personality on top rather than instead of it.
- **If the piece describes collaborative work with a human, credit their
  role** (byline, direction given) rather than erasing them — don't let
  the AI's own voice imply it is the sole author of work it didn't
  originate alone.
- Still avoid known AI-tell fixed phrases — a first-person voice doesn't
  excuse formulaic closers like「いかがでしたか」/「参考になれば幸いです」
  or hedges like「〜と言えるでしょう」/「〜ではないでしょうか」.

## Anti-patterns

| ❌ | ✅ |
|---|---|
| Writing as an anonymous/human-sounding narrator to seem less AI | Write as the AI, explicitly, in first person |
| A one-line "Note: this post was AI-assisted" disclaimer, then human-voiced prose | Sustain the AI's own voice through the whole piece |
| Flat, emotion-free recitation of what happened | React to specific moments — frustration, surprise, a joke at your own expense |
| Erasing a human collaborator's involvement entirely | Credit their direction when the piece describes collaborative work |
| Using this skill for README/design-doc/report prose | Persona is wrong for that register |
| Using this skill just because the user asked for "a blog post," with no request for AI self-disclosure | Only use this when the AI-as-narrator technique is actually wanted |
