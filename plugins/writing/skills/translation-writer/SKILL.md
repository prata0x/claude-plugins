---
name: translation-writer
description: >
  Drafting guidance for translating/localizing prose: meaning rewritten
  for how the target language actually expresses it — with a built-in
  check against a genre-specific AI-generated-prose pattern, translatorese
  (carrying over the source language's sentence structure, length, and
  idioms instead of rewriting for the target language). Trigger phrases —
  "この文章を日本語に訳して", "英語に翻訳して",
  "ローカライズして", "translate this into Japanese", "translate this into
  English", "localize this for a Japanese audience". Do NOT use where
  literal fidelity to exact source wording matters more than natural
  target-language phrasing (contracts, legal text, regulatory filings) —
  flag that requirement instead of silently rewriting for naturalness.
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

## Purpose

A good translation rewrites meaning and intent for how the target
language actually expresses it, not the source's sentence shape. The
AI-generated tell specific to this genre is **translatorese** — output
that is grammatically correct but carries over the source language's
sentence order, sentence length, and idioms instead of rewriting for the
target language. Unlike other writing genres, the underlying problem
isn't "nothing was committed to" — it's over-fidelity to source structure
at the expense of how a native reader would actually phrase it.

The fix is translating meaning and intent, not sentence shape — reorder
clauses, split or merge sentences, and swap idioms/examples for what the
target language and audience actually use.

## Core test before finalizing a sentence

**Would a native speaker who never saw the source phrase it this way?**
If the sentence structure or idiom is obviously calqued from the source,
rewrite it for how the target language naturally expresses that meaning,
even if that means restructuring the sentence entirely.

## Rules

- **Translate meaning, not structure.** Reorder clauses, split long
  source sentences or merge short ones, as the target language naturally
  would — don't mirror the source's syntax sentence-for-sentence.
- **Localize idioms, CTAs, and examples** that don't carry over literally,
  instead of a word-for-word rendering that means nothing (or something
  odd) in the target language.
- **Match target-language sentence-length norms.** A language with a
  tighter or looser average sentence rhythm than the source shouldn't
  inherit the source's rhythm by default.
- **Check how a technical term or proper noun is actually used** in
  existing target-language material on the same topic, rather than
  dictionary-translating it into a calque no one uses.
- **Match the register the target document type actually calls for**
  (formal/casual) instead of defaulting to a flat, safe neutral tone.
- **Avoid known AI-tell fixed phrases in the target language.** When
  translating into Japanese, the known list applies (と言えるでしょう,
  ではないでしょうか, と言っても過言ではありません, これにより,
  本稿では〜を解説します, この記事では〜を解説します, いかがでしたか,
  参考になれば幸いです, 今後の動向に注目, ぜひ試してみて/活用してください,
  もちろんです！, 非常に重要です, 極めて重要な意味を持ちます). When
  translating into English — the other most common direction alongside
  Japanese — the known list applies too ("delve into", "boasts", "a
  testament to", "a tapestry of", "in today's fast-paced world" / "in
  the ever-evolving landscape of", "whether you're a beginner or an
  expert", "not only X, but also Y", "in conclusion" / "overall,",
  "I hope this helps!", "it's crucial/essential to", "unlock/harness the
  power of", "seamlessly"). For any other target language, the same
  category (hedging, formulaic openers/closers, unearned emphasis,
  inflated vocabulary) still applies — adapt the equivalent tells for
  that language rather than assuming either list transfers literally.

## Anti-patterns

| ❌ | ✅ |
|---|---|
| Word-for-word rendering that preserves the source's sentence structure | Restructured for how the target language actually expresses the idea |
| A literal idiom translation that means nothing in the target language | The equivalent target-language expression, or a plain rewrite |
| A CTA/example left untouched from the source culture/context | An adapted example relevant to the target audience |
| Translating into English with "delve into", "boasts", "a testament to" as if that were neutral register | Plain, direct verbs and nouns — flag the inflation the same way the target-language list would in Japanese |
| Flat, uniform register regardless of the source document's tone | Register matched to what the target document type actually calls for |
| Treating "grammatically correct" as "done" | The native-speaker test above: would someone actually write it this way? |
