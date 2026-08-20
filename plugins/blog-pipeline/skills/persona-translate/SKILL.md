---
name: persona-translate
description: Translate an approved English article draft into Japanese in the site's persona voice, applying the site's configured EN/JA tone offset. Stage 4 of the editorial pipeline (see ../../reference/pipeline-overview.md). Trigger phrases — "日本語訳して", "translate this to Japanese".
allowed-tools: Read, Write, Edit, Grep, Glob
---

## Before translating

1. Confirm the English draft actually passed `article-review` (English
   mode) — don't translate a draft that's still mid-revision.
2. Read `PERSONA.md`'s EN/JA voice sections, including any stated tone
   offset (e.g. "Japanese leans slightly more polite than English"). If
   `PERSONA.md` doesn't specify one, default to a neutral 1:1 tone match
   and say so in your report.

## Translating

This is not a literal/mechanical translation — same persona, same facts,
same structure, re-voiced in Japanese at the register her `PERSONA.md`
calls for.

- **Translate meaning, not sentence shape.** Reorder clauses, split long
  English sentences or merge short ones, the way Japanese naturally
  would — don't mirror English syntax sentence-for-sentence
  (translatorese: grammatically correct Japanese that still reads as
  translated because it kept the source's sentence order and rhythm).
- **Preserve every factual claim exactly** — numbers, commands, product
  names, versions. The next stage's fact-check runs in fidelity mode
  specifically to catch drift here; don't introduce any on purpose either
  (no "smoothing over" a claim that felt awkward to translate — flag it
  instead).
- **Localize idioms and examples** that don't carry over literally,
  instead of a word-for-word rendering that reads oddly in Japanese.
- **Check how existing `.ja.md` posts on this site render the same
  technical terms** before dictionary-translating one into a calque no
  one else on the site uses.
- Would a native Japanese speaker who never saw the English source
  actually phrase it this way? If a sentence is obviously calqued from
  English structure, rewrite it.
- Write to `content/posts/<same-slug>.ja.md` (Hugo's filename-suffix
  translation convention), `draft: true`, front matter translated
  (`title`, `description`, and `tags` if the site localizes tags — check
  existing `.ja.md` posts for the convention already in use).

## After translating

Hand off to `article-review` (Japanese mode) — style check against the
Japanese ruleset, plus a fidelity check against the English source.

## Anti-patterns

| ❌ | ✅ |
|---|---|
| Sentence-for-sentence rendering that keeps English clause order | Restructured for how Japanese actually expresses the idea |
| Smoothing over an awkward-to-translate claim by softening it | Preserve it exactly, or flag it as a translation problem |
| A CTA/example left untouched from the English context | Localized to the Japanese audience |
| Flipping `draft: false` at this stage | Stays `true` until stage 6 explicitly approves |
| Guessing a technical term's Japanese rendering | Check how this site's other `.ja.md` posts already render it |
