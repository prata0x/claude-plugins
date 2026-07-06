---
name: handoff
description: >
  Write or update `tmp/handoff.md` so a future Claude Code session can resume
  mid-task work after `/clear`. The file is designed to be the next session's
  first prompt. Trigger phrases — "handoff 書いて", "handoff 更新して",
  "tmp/handoff.md を書いて / 更新して", "次セッション用に引き継ぎ作って",
  "/handoff", "write a handoff", "create a handoff for the next session".
  Do NOT use as a substitute for `/compact` (which preserves CLAUDE.md /
  system prompt in-session) or for capturing durable user/project facts
  (use the memory system instead).
allowed-tools: Bash, Read, Write
---

## Purpose

Write `tmp/handoff.md` — a snapshot of the current session that serves as the next session's first prompt after `/clear`.

## When to invoke

Trigger when the user asks for a session-spanning snapshot:

- 「handoff 書いて」「handoff 更新して」
- 「tmp/handoff.md を書いて / 更新して」
- 「次セッション用に引き継ぎ作って」
- 「/handoff」
- "write a handoff", "create a handoff for the next session"

## Critical rules

- **Overwrite, never append — but never regress.** `tmp/handoff.md` is a snapshot of latest state. If a prior handoff already exists, read it before drafting the new one and carry forward any of its remaining tasks that this session did not complete or supersede — losing a tracked task to a silent overwrite is worse than a stale file.
- **Self-contained as a prompt.** The next session's first user input is the path `tmp/handoff.md` (or `/handoff-resume`).
- **Do not restate CLAUDE.md.**
- **Reference, never inline.** Point at `path:line`, commit SHAs, PR / issue refs. Never paste diffs or file contents.
- **Remaining tasks section is required.** If empty, do NOT write a handoff.
- **Soft secret check.** Before writing, run `node "${CLAUDE_PLUGIN_ROOT}/scripts/check-secrets.mjs" <draft-file>` against the drafted content (write the draft to a temp path first if it only exists in-memory).

   On a match (exit 2), surface the matched line and offer three explicit choices: (a) **redact** the value with `<REDACTED>` (default), (b) **abort the handoff**, (c) **proceed unredacted** (only on explicit "proceed unredacted" confirmation — a bare "OK" is not sufficient). Default to (a) if the user's response is ambiguous.

## File template

The skeleton lives in `handoff-template.md`, a sibling of this file. Read it when drafting. Drop a section ONLY if it would be genuinely empty (e.g. no gotchas this session). Keep the `Status`, `Remaining tasks`, and `Suggested first action` sections always.

## Workflow

1. **Ensure target dir exists** — `mkdir -p tmp/` if missing. The target file is always `tmp/handoff.md`.
2. **Read any prior handoff first.** If `tmp/handoff.md` already exists, read it before drafting. Note its `Remaining tasks`; anything not completed or superseded this session must carry forward into the new draft.
3. **Confirm remaining work exists.** If no meaningful remaining tasks — the user is at a clean stop — STOP HERE: tell the user a handoff is unnecessary and do not write the file.
4. **Draft sections** following `handoff-template.md` from current session state: what was done, key decisions, what is pending, what to avoid. Reference paths and commits — do not paste their contents.
5. **Soft secret check** the draft (see "Soft secret check" above). On hit, surface the matched line and resolve with the user before continuing.
6. **Write** the file with the Write tool (overwriting any prior content).
7. **Report** in Japanese: target path, count of remaining tasks (separating blocked), one-line suggested next action.

## Anti-patterns

- ❌ Appending to a prior handoff. It is a snapshot — overwrite.
- ❌ Overwriting without reading the prior handoff first. A remaining task from the old file that nobody carried forward is silently lost.
- ❌ Pasting code or diffs. Reference paths and commits.
- ❌ Restating CLAUDE.md rules. They are reloaded automatically; restating dilutes them.
- ❌ Writing a handoff with no remaining tasks. The handoff has no purpose then.
- ❌ Using `/handoff` as a substitute for `/compact`. Different tools, different audience.
- ❌ Saving to OS tmp (`/tmp/`). Workspace `tmp/` is the convention.
- ❌ Listing completed tasks for completeness. Only remaining work belongs here.
- ❌ Re-explaining the project. CLAUDE.md handles that; the next session has it loaded.
