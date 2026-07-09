---
name: blog-writer
description: >
  Drafting guidance for general blog articles/posts (any voice — opinion
  piece, tutorial, narrative): a real stance, concrete specifics, varied
  rhythm, no formulaic phrasing — with a built-in check against generic,
  hedge-heavy AI-generated-prose patterns. Trigger phrases —
  "ブログ記事を書いて", "記事にして", "この件を記事にまとめて",
  "write a blog post about this", "turn this into an article",
  "draft a blog post". Do NOT use for README/design-doc/report prose —
  that register wants direct, terse writing, not blog voice. Do NOT use
  when the user explicitly wants the AI itself presented as a disclosed,
  first-person narrator — that's a different, more specific technique
  than general blog writing.
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

## Purpose

A good blog post commits to a specific, checkable claim or a real opinion
— not a take that could belong to any similar post on any similar topic.
That same gap, absence of a writer's actual stance, is also what makes a
blog post read as AI-generated, and blog register makes it easier to hide
(an exclamation point or a rhetorical question can read as "voice" while
saying nothing), which makes the underlying problem worse, not better.

Adding tone (jokes, exclamation points, casual phrasing) without fixing
substance is cosmetic. The fix is the same as any other register:
specific claims, real detail, an actual stance the writer could be wrong
about — just delivered in whatever voice fits a blog post rather than a
technical document.

## Core test before writing a paragraph

**Could this paragraph appear unchanged in a post about a completely
different topic?** If yes, it's not saying anything — replace it with a
concrete detail (a specific example, a number, an opinion you'd defend)
or cut it.

## Rules

- **Take an actual position**, not a survey of "some say X, others say
  Y" with no landing. A stance you could be wrong about is more
  interesting to read than a balanced non-answer.
- **Use concrete examples and specifics** — a real anecdote, a number, a
  named example — instead of generic claims that could apply to anything
  in the category.
- **Vary paragraph and sentence rhythm.** Do not force every section into
  the same intro-body-bullets-conclusion template; that rhythm itself
  reads as AI-generated regardless of content.
- **Use lists only where the content is actually list-shaped.** Narrative
  or argumentative content reads better as connected prose than as
  bullets.
- **Cut formulaic openers/closers** — no "This post explains...", no
  "So, what did we learn?", no "Hope this was helpful!" Start with
  content; stop when the content is done.
- **Voice is the user's call, not this skill's.** First-person opinion,
  second-person tutorial, narrative story — any of these are fine. This
  skill fixes substance, not persona.
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
| "There are many ways to approach this problem" | A stated preference, with the specific reason for it |
| Every section shaped as intro sentence + 3 bullets + wrap-up line | Vary structure by what the section actually needs to say |
| Exclamation points / rhetorical questions standing in for actual voice | Specific opinions and concrete detail, in whatever tone fits |
| A generic example that could belong to any post on the topic | A specific, real example tied to this piece |
| Treating "no known AI-tell phrases present" as "done" | That list only catches the shallowest layer; the paragraph test above is the real bar |
