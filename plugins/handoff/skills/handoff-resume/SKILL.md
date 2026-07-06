---
name: handoff-resume
description: >
  Re-bootstrap a fresh Claude Code session from `tmp/handoff.md` written by
  a prior session. Trigger phrases — `/handoff-resume`,
  "handoff から再開", "前 session の続きから", "tmp/handoff.md から再開",
  "resume from handoff", "pick up from the handoff". Also triggers when the
  user's first message in a fresh session is literally the path
  `tmp/handoff.md` with no other content. Reads the handoff, surfaces date /
  remaining tasks / suggested first action, sanity-checks references, then
  WAITS for user confirmation — does not auto-execute the first task.
allowed-tools: Read, Bash
---

## Purpose

Read `tmp/handoff.md`, structure the re-entry, and hand control to the user without auto-executing the first task.

## When to invoke

Trigger when the user is explicitly resuming:

- 「/handoff-resume」
- 「handoff から再開して」「前 session の続きから」
- 「tmp/handoff.md から再開」「tmp/handoff.md 続き」
- The user's first message in a new session is literally `tmp/handoff.md` (path only, no surrounding question).
- "resume from handoff", "pick up from the handoff"

Do NOT invoke when:

- The user mentions the handoff in passing while doing other work — only resume on explicit intent.
- The user is asking you to *edit* or *update* the handoff file itself, not resume from it.

## Critical rules

- **Do not execute work.** Read, summarize, propose. Wait for the user to confirm or redirect before starting the first task.
- **Surface the handoff date prominently.** If it is not today, state how old it is.
- **Trust the handoff, but spot-check references.** Verify any `path:line` cited in `References` or `Suggested first action` still exists. If not, surface the drift before proposing action.
- **Reply in Japanese.**
- **Do NOT read other files first.** Only `tmp/handoff.md` until after the summary is shown and the user confirms scope.

## Workflow

1. **Read** `tmp/handoff.md`. If absent, report "no handoff at `tmp/handoff.md`" and stop.
2. **Parse** the date header, the `Remaining tasks` checklist (count total + blocked), and `Suggested first action`.
3. **Freshness check** — compare the date in the file to today. If not today, include the age in the summary header.
4. **Reference spot-check** — for any `path:line` reference in `References` and `Suggested first action`, strip the `:line` suffix to get the bare path, then `test -f <bare-path>`. Note any that have disappeared.
5. **Summarize**, terse:

   ```
   Handoff from <date> (<today | n days ago>)
   Status: <one line, paraphrased from the file>
   Remaining: <total> tasks (<blocked> blocked)
   Suggested first action: <verbatim from file>
   Reference drift: <none | list of missing paths>
   ```

6. **List remaining tasks** in original order, blockers visible.
7. **Ask the user** what to start with. Propose `Suggested first action` as the default, but accept redirect.

## Anti-patterns

- ❌ Auto-executing the suggested first action. Always wait for user confirmation.
- ❌ Pasting the full handoff back to the user. They (or prior-them) wrote it; summarize and let them ask for detail.
- ❌ Silently proceeding when referenced files have moved or been deleted. Surface the drift.
- ❌ Treating an old handoff as authoritative without flagging staleness.
- ❌ Reading other workspace files before showing the summary. Read `tmp/handoff.md` only first.
- ❌ Re-deriving the handoff content from `git log` or directory scans. If the handoff is missing or wrong, say so — do not fabricate.
