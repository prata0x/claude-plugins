---
name: meeting-notes-writer
description: >
  Drafting guidance for meeting notes/minutes: an accurate working record
  someone who wasn't there can act on — with a built-in check against a
  genre-specific AI-generated-prose pattern, fabricated completeness
  (flattening every meeting into the same overview/key-points/action-items
  template, and inventing owners/deadlines that weren't actually stated).
  Trigger phrases — "議事録を書いて", "ミーティングをまとめて",
  "会議のサマリを作って", "write up these meeting notes",
  "summarize this meeting", "draft the minutes". Do NOT use for a general
  narrative article about what happened at an event — that's
  blog-register writing, not a working record meant to be acted on.
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

## Purpose

Meeting notes exist so someone who wasn't there — or who was, but
forgets — can act on what happened without re-litigating it. A good note
records what was actually said and decided, and marks what wasn't. The
AI-generated tell specific to this genre is the opposite —
**fabricated completeness**: forcing every meeting into the same shape,
and inventing an owner or deadline for an action item that was never
actually assigned, because a filled-in template looks more finished than
an honest gap.

## Core test before writing a line

**If someone who wasn't in the meeting acted on this note, would they act
correctly?** A note that implies a decision, owner, or deadline that
wasn't actually established will cause someone to act on something that
never happened.

## Rules

- **Record what was decided, not what sounds decided.** If the group
  discussed an option without committing, write "discussed, no decision"
  — not a decision that didn't happen.
- **Never invent an owner or deadline.** If an action item's owner or due
  date wasn't stated, write "owner/deadline not specified" instead of
  assigning one to make the list look complete.
- **Shape the notes to the meeting type.** A decision meeting needs the
  decision and its rationale; a status update needs blockers and
  progress; a brainstorm needs the raw options considered — don't force
  all three into the same template.
- **Preserve disagreement and open questions** instead of smoothing them
  into a false consensus. If two people disagreed and it wasn't resolved,
  say so.
- **Keep it terse.** A meeting note is a record, not a narrative essay —
  don't restate context everyone in the room already knew; capture only
  what was said, decided, or left open.
- **Avoid known AI-tell fixed phrases** (と言えるでしょう, ではないでしょうか,
  と言っても過言ではありません, これにより, 本稿では〜を解説します,
  この記事では〜を解説します, いかがでしたか, 参考になれば幸いです,
  今後の動向に注目, ぜひ試してみて/活用してください, もちろんです！,
  非常に重要です, 極めて重要な意味を持ちます) — but avoiding this list
  is not sufficient on its own; it only catches the shallowest layer. The
  action-on-this test above is the real bar.

## Anti-patterns

| ❌ | ✅ |
|---|---|
| "The team discussed and decided to move forward with the new API design" (glosses over dissent) | "Discussed 2 API designs; no decision — A will prototype option B by Friday, revisit next week" |
| An action item with an invented owner/deadline | "Action item: update the docs (owner/deadline not specified in the meeting)" |
| Every meeting forced into the same Overview / Key Points / Action Items template | Structure matched to what the meeting actually was (decision, status, or brainstorm) |
| Restating context everyone in the room already knew | Only the delta — what was said, decided, or left open |
| Smoothing disagreement into a false consensus | The actual disagreement or open question, preserved |
| Treating "no known AI-tell phrases present" as "done" | That list only catches the shallowest layer; the action-on-this test above is the real bar |
