---
name: dev-artifact-writer
description: >
  Drafting guidance for commit messages, PR descriptions, issue bodies, and
  PR/issue review comments: substance a reviewer can't already get from
  the diff — with a built-in check against a genre-specific AI-generated-
  prose pattern, restating the diff/title in prose instead of adding what
  a reviewer can't already see. Trigger phrases — "PRの説明を書いて",
  "コミットメッセージを書いて", "issueを作成して", "issueにまとめて",
  "PRコメントを書いて", "レビューコメントを返信して", "write a PR description",
  "write a commit message", "file an issue", "reply to this review
  comment". Does not cover format/process conventions (Conventional
  Commits grammar, decision-content-only comment scoping, language
  choice) — those are separate, already-governed concerns; this skill
  only fixes AI-generated-sounding substance within whatever format
  applies. Do NOT use for README/design-doc/report prose or blog
  articles — those are different registers with a different audience.
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

## Purpose

Commit messages, PR descriptions, issue bodies, and review comments have a
reader who is about to look at the diff anyway — a reviewer or a future
maintainer. A good one spends its words on what the diff *can't* show:
why the change was made, what broke without it, what tradeoff was picked
over the alternatives. **Restating the diff in prose** instead — "This PR
adds a null check to the validation function" when the diff already shows
exactly that — is also the specific way this genre reads as
AI-generated: it pads the artifact without adding anything the reader
couldn't get faster by reading the code.

## Core test before writing a sentence

**Does this sentence tell the reader something the diff/title doesn't
already show?** If it just narrates what changed in prose, cut it. Keep
only the why, the trigger, and the tradeoff.

## Rules

- **Lead with the reason, not the mechanism.** "Retries were duplicating
  rows because the existence check ran before the transaction committed"
  beats "This PR fixes an issue in the retry logic."
- **Cite the concrete trigger** — an error message, a repro step, a
  file:line, an actual failing case — not a category like "an issue with
  error handling."
- **Skip sections with nothing to say** rather than padding them. An
  omitted "## Motivation" beats "This change was made to improve the
  codebase."
- **State impact only if it's known**, not asserted for effect. "Cuts
  build time from 4m to 1m" needs a real measurement; if there isn't one,
  don't claim it.
- **Issue bodies: state the observed behavior and the expected behavior**,
  not a paraphrase of the title. "Clicking submit twice creates two
  orders" is a bug report; "There is a problem with the submit button" is
  not.
- **Review comments: react to the actual code**, not a template
  acknowledgment. "This drops the lock before the write completes — race
  with the reader on line 88" beats "Looks good, just one small
  suggestion."
- **Avoid known AI-tell fixed phrases** (と言えるでしょう, ではないでしょうか,
  と言っても過言ではありません, これにより, 本稿では〜を解説します,
  この記事では〜を解説します, いかがでしたか, 参考になれば幸いです,
  今後の動向に注目, ぜひ試してみて/活用してください, もちろんです！,
  非常に重要です, 極めて重要な意味を持ちます) — but avoiding this list
  is not sufficient on its own; it only catches the shallowest layer. The
  reader test above is the real bar.

## Anti-patterns

| ❌ | ✅ |
|---|---|
| "This PR adds a check to validate X before processing" (restates the diff) | "Rejects empty X before it reaches the parser — previously threw a raw nil-deref 3 layers down" |
| "Fixes a bug in the retry logic" | "Retries no longer duplicate rows: the existence check ran before the transaction committed" |
| "There is an issue with the login page" | "Login redirects to /undefined when the OAuth callback omits the state param" |
| "## Test plan\nThis was tested to ensure it works correctly." | A specific check actually run, or an honest "not tested — no repro environment available" |
| "Looks good, just one small suggestion!" | The actual suggestion, with the reason it matters |
| Treating "no known AI-tell phrases present" as "done" | That list only catches the shallowest layer; the reader test above is the real bar |
