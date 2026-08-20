---
name: persona-blog-writer
description: Draft the English-language article for a blog post in the site's fictional persona voice, once the user and the agent have agreed on a topic and angle. Stage 2 of the editorial pipeline (see ../../reference/pipeline-overview.md). Trigger phrases — "記事を書いて", "write the article", "draft this post".
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

## Before writing

1. Read `PERSONA.md` at the site repo root. If it's missing, stop and ask
   the user to write one first (see this plugin's
   `reference/pipeline-overview.md` for the expected shape) — never
   invent a persona ad hoc, and never fall back to a neutral/generic
   voice.
2. Confirm the topic and angle were actually agreed with the user in this
   conversation, not assumed.
3. Skim `content/posts/*.md` (English files only) for anecdotes/phrasing
   this persona has already used — an anecdote or catchphrase repeated
   verbatim across articles is itself an AI-tell, per `PERSONA.md`'s
   behavioral-tics section.

## Writing

The substance bar is the same one that makes any prose read as
human-written, applied through this specific voice:

- **Take an actual stance.** A sentence that could appear unchanged in a
  post about a different topic isn't saying anything — replace it with a
  concrete detail (a real number, a command that actually ran, an opinion
  she'd defend) or cut it.
- **Ground every claim in specifics** she could be wrong about — exact
  versions, actual commands, actual numbers — not vague generalities.
  These claims get checked in the next stage; write them checkable.
- **Vary rhythm.** Don't force every section into the same
  intro-body-bullets-conclusion shape; use lists only where the content
  is genuinely list-shaped (a real procedure, a real options table).
- **Voice comes from `PERSONA.md`**, not from generic "blog tone" —
  her specific opinions, her specific failure stories (used sparingly per
  the note above), her specific way of explaining a fix. Sustain it for
  the whole piece, not just the intro.
- **Cut formulaic openers/closers.** No "This post explains...", no
  "Hope this helps!" Start with content; stop when the content is done.
- **Avoid the persona's own NG-phrase list** in `PERSONA.md`, plus the
  general known AI-tell phrases (と言えるでしょう, ではないでしょうか,
  と言っても過言ではありません, これにより, 本稿では〜を解説します,
  この記事では〜を解説します, いかがでしたか, 参考になれば幸いです,
  今後の動向に注目, ぜひ試してみて/活用してください, もちろんです！,
  非常に重要です, 極めて重要な意味を持ちます, and their English
  equivalents: "delve into", "boasts", "a testament to", "a tapestry of",
  "in today's fast-paced world", "whether you're a beginner or an
  expert", "not only X, but also Y", "in conclusion", "I hope this
  helps!", "it's crucial/essential to", "unlock/harness the power of",
  "seamlessly"). This list only catches the shallowest layer — the stance
  test above is the real bar; the next stage's automated review checks
  what this list can't.
- Standard Hugo/Blowfish front matter (`title`, `date`, `draft: true`,
  `tags`, `description`). Leave `draft: true` — only the user's explicit
  publish approval after Japanese human review changes it (stage 6 in
  `reference/pipeline-overview.md`).
- Write to `content/posts/<slug>.md` on the site's normal topic branch
  (see the site's own `CLAUDE.md` for its branching convention).

## After writing

Hand off to `article-review` (English mode) — don't translate yet.

## Anti-patterns

| ❌ | ✅ |
|---|---|
| Writing in a generic "helpful blog" voice when `PERSONA.md` exists | Her specific stance and phrasing, every paragraph |
| Reusing the same anecdote/catchphrase from an earlier post | Check existing posts first; vary or retire it |
| Proceeding without `PERSONA.md` in a "neutral" voice as a fallback | Stop and ask the user to write one |
| Flipping `draft: false` at this stage | Stays `true` until stage 6 explicitly approves |
