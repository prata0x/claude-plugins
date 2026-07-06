---
name: align
description: >
  Short alignment loop before implementation — restate the request in plain
  language, ask blocking questions (via AskUserQuestion where the answer
  reduces to a few discrete options), produce a free-form spec sketch,
  surface vocabulary drift, append durable terms to `docs/glossary.md` in
  Japanese, and persist the agreed sketch to a GitHub issue.
  Trigger phrases — "仕様詰めたい", "先に相談", "いきなり書かないで",
  "/align", "align", "spec を sketch", "let's align first", "sketch the spec".
  Soft-auto: when a new feature / behavior request lacks a clear spec and
  is not trivially small, ask the user once whether to align first.
  Do NOT invoke for bug fixes, refactors with no behavior change, or when
  the user already supplied a concrete spec.
allowed-tools: AskUserQuestion, Bash, Read, Write, Edit
---

## Purpose

Pre-implementation alignment loop. Restate in plain language, ask blocking questions, sketch, surface vocabulary, stop before code, persist the agreed sketch.

## When to invoke

**Explicit triggers**:

- 「仕様詰めたい」「先に相談」「いきなり書かないで」
- 「/align」「align」「spec を sketch して」
- "let's align first", "sketch the spec"

**Soft-auto** — propose alignment (single AskUserQuestion, no loop) when ALL three hold:

- The user requests new behavior or a new feature.
- No clear spec is present. "Clear spec" = concrete input/output examples, a referenced spec file, or behavior an implementer could code without clarifying questions. Confident tone is not a substitute.
- Scope is not trivial (not a typo fix, rename, single-line change).

Single question with two options: "Align first" / "Just implement". User picks; no retry. Default to "Just implement" on ambiguity.

Do NOT invoke when:

- The request is a bug fix → debug approach instead.
- The request is a refactor with no behavior change.
- The user already supplied a concrete spec.
- The user explicitly says "just do it" / "そのまま実装".

## Workflow

### 1. Read existing glossary
Read `docs/glossary.md` if it exists. Hold its terms in working context for steps 2–5. Skip silently if absent.

### 2. Restate
Paraphrase the user's request in 2–3 lines, in Japanese, using plain ordinary wording — no jargon-as-precision. Do not cite glossary terms in the restatement itself. If a user term collides with an existing glossary term under a different meaning, flag that collision as a one-line term check; otherwise leave the glossary out of this step entirely.

### 3. Ask
Ask only questions that block proceeding. If a question can be defaulted, do NOT ask — set the default and surface it inline in the sketch ("default: X — change if needed"). No fixed cap; ask as many as truly block, zero is fine.

- If a question's answer reduces to a small set of discrete options (yes/no, choose-among-named-alternatives), use `AskUserQuestion` — batch up to 4 such questions per call.
- If a question genuinely needs free-form input (a name, a value, an open description that doesn't fit fixed options), ask it as plain text instead.
- When both kinds exist, run the `AskUserQuestion` batch first, then ask the plain-text questions in the same turn.

### 4. Sketch
Produce a free-form prose sketch the user can correct. No template, no Inputs/Outputs/Non-goals headings. 5–10 lines is the usual size. Defaults set in step 3 stay explicit in the sketch.

### 5. Glossary additions
If new durable project terms emerged during steps 2–4, propose appending them to `docs/glossary.md`:

```
- **term** — short definition
```

Write both the term and its definition in Japanese, using plain ordinary wording — do not coin or borrow English jargon. The only exception is a proper noun with no natural equivalent (an API name, a library name, a protocol name); use it as-is, untranslated.

Append to a flat list. If `docs/` does not exist, `mkdir -p docs/` and create the file with a `# Project glossary` header before the first append. Confirm additions with the user before writing; on decline, skip the append silently.

### 6. Stop
Do not start implementation. Wait for the user's explicit go signal — e.g. "go", "OK そのまま", "やって", or a returned edit accepting the sketch. Silence does not count.

### 7. Persist
Once "go" arrives, before returning control to the parent session, offer to persist the finalized sketch (the sketch text plus any defaults resolved in step 3) as a durable record:

- If the request already references a GitHub issue, append the sketch as a comment on that issue (`gh issue comment`).
- Otherwise, offer to create a new issue with the sketch as the body (`gh issue create`).
- Ask once before writing (a single `AskUserQuestion`: persist / skip) — never persist silently.
- Write decision content only — the final sketch and resolved defaults — no conversational narration, dates, or meta-commentary.
- If `gh` is unavailable or the repo has no GitHub remote, say so and skip; this does not block returning control.

After this, return control to the parent session; do not auto-invoke `tdd` or any other implementation skill.

## Anti-patterns

| ❌ | ✅ |
|---|---|
| Asking nice-to-have / edge-case / style questions | Ask only blocking questions; default the rest inline in the sketch. |
| Producing a structured "Inputs / Outputs / Non-goals" template | Free-form prose. |
| Writing terms to `CLAUDE.md` | Append to `docs/glossary.md`. |
| Coining or borrowing English jargon for glossary terms/definitions | Write both in Japanese; English only for untranslatable proper nouns. |
| Citing glossary terms in the Restate paraphrase | Keep Restate in plain language; only flag genuine term collisions. |
| Forcing an open-ended answer into fixed `AskUserQuestion` options | Use plain text when the answer needs free-form input. |
| Auto-starting implementation after sketch acceptance | Wait for explicit "go" — sketch acceptance ≠ implementation start. |
| Looping the soft-auto question on ambiguous user reply | Single AskUserQuestion. Default to "Just implement". |
| Re-asking the same questions on iteration | If the user redirects, restart from Restate, not from the soft-auto. |
| Forcing alignment on bug fixes / refactors | Out of scope. |
| Persisting the sketch to GitHub silently | Ask once (persist / skip) before writing; decision content only, no narration. |
