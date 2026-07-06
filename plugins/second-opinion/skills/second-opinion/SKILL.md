---
name: second-opinion
description: >
  Get an independent second opinion on a plan or a stuck problem from a
  model outside the main session — no shared context, so no contamination
  from the current session's own reasoning. Tries GitHub Copilot CLI
  first, falls back to OpenAI Codex CLI, falls back to a dedicated opus
  subagent if both CLIs are unavailable or fail. Soft-auto: before
  starting a large addition / change / fix, get a plan review (whether to
  act on the feedback is your judgment call); after repeated failed
  attempts at the same problem, or when a failure's root cause can't be
  pinned down, get a second opinion. Runs unconditionally when triggered —
  no confirmation needed, only a report afterward. Trigger phrases —
  "セカンドオピニオン", "他の意見も聞いて", "外部レビューして",
  "second opinion", "get another opinion", "check this with another model".
  Do NOT use when the user explicitly directs the request at one specific
  backend (use `copilot` or `codex` directly for that) — this skill is for
  the autonomous fallback chain.
allowed-tools: Agent, Bash, Read
---

## Purpose

An independent second opinion from a model outside this session — different context, different model, no contamination from this session's own reasoning. Falls back copilot → codex → opus subagent so it never stalls on one backend's availability.

## When to invoke

**Soft-auto** — no confirmation needed; announce briefly and proceed:

- Before starting a large addition, change, or fix: get a plan review before writing code. Whether to incorporate the feedback is your judgment call.
- After repeated failed attempts at the same problem, or when a failure's root cause can't be pinned down: get a second opinion before continuing to guess.

**Explicit triggers**: "セカンドオピニオン", "他の意見も聞いて", "外部レビューして", "second opinion", "get another opinion", "check this with another model".

Do NOT invoke when:

- The user explicitly wants one specific backend — use `copilot` or `codex` directly instead.
- The task is trivially small.

## Workflow

### 1. Build the question
Write a self-contained English prompt describing what needs review: the plan/sketch, or the stuck situation (what's been tried, what failed, what's uncertain). Use the same question regardless of which backend ends up answering it.

### 2. Try Copilot
Follow the `copilot` skill's invocation (write the prompt to a tmp file, run `copilot.mjs`). If it exits 0 with a usable answer, use it and skip to step 5.

### 3. Fall back to Codex
If Copilot failed (non-zero exit, CLI not found, empty or garbled output), follow the `codex` skill's invocation with the same prompt. If it exits 0 with a usable answer, use it and skip to step 5.

### 4. Fall back to the opus subagent
If both CLIs failed, dispatch `Agent` with `subagent_type: second-opinion-opus` and the same prompt. This has no external CLI dependency, so treat it as the guaranteed last resort.

### 5. Report
State in Japanese which backend actually answered (Copilot / Codex / opus subagent) and summarize its opinion. If it disagrees with your own read, surface that honestly — that's the value of asking. Decide for yourself whether to act on the feedback, and say what you decided.

## Anti-patterns

| ❌ | ✅ |
|---|---|
| Asking the user for confirmation before running this | Soft-auto: run and report, no gate. |
| Retrying a failed backend before falling through | One attempt per backend, then fall through. |
| Silently giving up when Copilot fails | Fall through to Codex, then the opus subagent — the chain always produces an answer. |
| Treating the second opinion as authoritative | You decide whether to act on it; say what you decided in the report. |
| Using this for a user-directed single-backend request | Use `copilot` or `codex` directly instead. |
