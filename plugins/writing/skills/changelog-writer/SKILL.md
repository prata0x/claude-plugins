---
name: changelog-writer
description: >
  Drafting guidance for changelog/release-notes entries: a self-describing
  entry the reader can act on without reading the PR/diff behind it —
  with a built-in check against a genre-specific AI-generated-prose
  pattern, the vague catch-all entry ("various bug fixes and
  improvements") that means nothing on its own. Trigger phrases —
  "changelogを書いて", "リリースノートをまとめて", "変更履歴に追記して",
  "write a changelog entry", "draft release notes", "update the
  changelog". Do NOT use for
  the PR description itself or a commit message — those target a
  reviewer reading the diff; a changelog entry targets a downstream
  user/integrator who never sees the diff, which is a different audience
  with different needs.
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

## Purpose

A changelog entry's reader never sees the diff or the PR — they only see
the entry itself, often while deciding whether to upgrade. A good entry is
self-describing: what changed *for the reader*, stated plainly enough
that they don't need the PR to understand it. The AI-generated tell
specific to this genre is the opposite — a **vague, catch-all entry**
("Various bug fixes and performance improvements", "Updated the
authentication module") that could describe almost any release and gives
the reader nothing to act on.

## Core test before writing an entry

**Could this entry be pasted into a different release without editing a
word?** If yes, it's not describing anything specific — name the actual
user-visible change or cut the entry.

## Rules

- **State what changed for the reader**, not the internal mechanism.
  "Fixed a crash when exporting a project with no assets" beats "Fixed a
  bug in the export module."
- **One entry, one change.** Don't fold three unrelated fixes into a
  single vague bullet just to keep the list short.
- **Never use a catch-all bucket** ("various improvements", "misc fixes")
  as an actual entry. If a change is too minor to describe, it's too
  minor to list — omit it rather than padding the list with a phrase that
  says nothing.
- **Write for the changelog's actual audience**, not the PR reviewer.
  Don't paste the PR title verbatim — a PR title targets someone who will
  read the diff; a changelog entry targets someone who won't. Drop
  internal file/module names the reader won't recognize.
- **Match this project's existing entry format and tense** rather than
  introducing a new template — consistency inside one changelog matters
  more than which convention was picked.
- **Avoid known AI-tell fixed phrases** (と言えるでしょう, ではないでしょうか,
  と言っても過言ではありません, これにより, 本稿では〜を解説します,
  この記事では〜を解説します, いかがでしたか, 参考になれば幸いです,
  今後の動向に注目, ぜひ試してみて/活用してください, もちろんです！,
  非常に重要です, 極めて重要な意味を持ちます) — but avoiding this list
  is not sufficient on its own; it only catches the shallowest layer. The
  self-describing test above is the real bar.

## Anti-patterns

| ❌ | ✅ |
|---|---|
| "Various bug fixes and performance improvements" | "Fixed a crash when exporting a project with zero assets" |
| "Updated the authentication module" | "Sessions now expire after 30 minutes of inactivity instead of never" |
| Three unrelated fixes folded into one bullet | One bullet per user-visible change |
| An entry that only makes sense after reading the PR | An entry that stands alone, in language the reader understands |
| Pasting the PR title verbatim as the entry | Reframed for the changelog's audience, not the reviewer's |
| Treating "no known AI-tell phrases present" as "done" | That list only catches the shallowest layer; the self-describing test above is the real bar |
