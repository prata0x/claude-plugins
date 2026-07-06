---
name: copilot
description: Delegate a read-only task (review, investigation, second opinion) to GitHub Copilot CLI. Trigger phrases — "copilot にレビュー依頼して", "copilot に調査依頼して", "copilot に見てもらって", "ask copilot", "delegate to copilot", "get copilot's opinion". Hard-isolated to view/rg/glob (no writes, no shell, no network, no git/gh) via the bundled copilot.mjs script. Do NOT use when the user wants Claude itself to do the work, when Copilot should modify files, or when Copilot is mentioned only in passing.
allowed-tools: Bash, Read
---

## Purpose

Delegate a **read-only** task to GitHub Copilot CLI — code review, investigation, second opinion on a plan or design. The skill does not let Copilot modify files; for that, do the work yourself.

## When to invoke

Trigger when the user asks Claude to involve Copilot in review or investigation:

- 「copilot にレビュー依頼して」「copilot に見てもらって」
- 「copilot に調査依頼して」「copilot で調べて」
- "ask copilot to review / investigate / look at ..."

Do NOT invoke when:
- The user wants Claude itself to do the work.
- The user wants Copilot to **modify** files (this skill is hard-isolated to read-only — tell the user).
- The user mentions Copilot in passing (e.g. "Copilot autocomplete is annoying").

## Critical rules

- **Never paste-and-ask.** Execute via the Bash tool; do not produce a copilot command for the user to run.
- **Prompt body must be English.** Copilot performs better with English. Reply to the user in Japanese.
- **No secrets in the prompt.** Copilot persists session logs to `~/.copilot/logs/`. Strip credentials, tokens, API keys, internal hostnames before submission. The script will reject prompts that match obvious token/key/password patterns.
- **Read-only only.** This skill cannot fix, edit, push, install, or fetch. If the user asks for those, refuse and offer to have Claude do the work directly.

## Building the prompt body

Write a self-contained English prompt:

- **Task statement** — one sentence: what to investigate or review.
- **Scope** — concrete paths, refs, or SHAs. Resolve "this file" / "the recent change" to specifics before writing.
- **Output expectation** — structured findings with `file:line` references.

### Inlining git context (only when needed)

If the question genuinely needs history (review of a change, "why is this here"), pre-extract and inline under a `## Git context` heading. Skip when the question is about current code only.

Caps (enforce):
- `git log`: max 30 lines (`-n 30`)
- Diff: max 500 lines or 50 KB
- Blame: max 200-line window (`-L start,end`)
- `git log -p`: max 3 commits

Secret redaction before inlining (mandatory):
- Exclude secret-bearing paths: `git diff ... -- ':(exclude).env' ':(exclude)*.pem' ':(exclude)secrets/**'`
- Scan output for `(token|key|secret|password|bearer|api_key)\s*[=:]\s*\S+` and redact the value.
- If the result is unintelligible after redaction, summarize in prose instead.

## Invocation

Write the prompt body to a tmp file, then invoke the bundled script:

```bash
PROMPT_FILE=$(mktemp /tmp/copilot-prompt.XXXXXX)
cat > "$PROMPT_FILE" <<'EOF'
<English prompt body here>
EOF
node "${CLAUDE_PLUGIN_ROOT}/skills/copilot/copilot.mjs" --prompt-file "$PROMPT_FILE"
rm -f "$PROMPT_FILE"
```

Optional flags (append before the `--prompt-file` arg or after it):
- `--cwd "<absolute path>"` — target is outside the current working directory.
- `--model <id>` — overrides the script's default model. Pass this only if the user explicitly requested a different model.
- `--effort <level>` — overrides the script's default reasoning effort. Pass this only if the user explicitly requested a different effort level.

Bash tool timeout: `300000` (5 min). Do not silently retry on timeout — split scope or narrow the question.

## Trusted directory

Copilot requires the working directory to be trusted. If `--no-ask-user` aborts due to an untrusted directory, tell the user to run `copilot` interactively once there to grant trust, then re-invoke.

## After Copilot returns

- Report in Japanese. Summarize Copilot's response; do not paste raw output if long.
- If Copilot disagrees with what Claude would say, surface the disagreement honestly — that is the value of a second opinion.
- On non-zero exit or refusal: report the failure clearly. Common causes: untrusted directory, the task implicitly required write/shell (this skill grants neither), Copilot rate limit, API error.

## Anti-patterns

- ❌ Running `copilot --help` to "remember" flags. They live in `copilot.mjs`.
- ❌ Generating a copilot command and asking the user to run it. Execute via Bash.
- ❌ Inlining 1000-line diffs. Narrow with `-- <path>` or summarize.
- ❌ Inlining `## Git context` when the question is about current code, not history.
- ❌ Including secrets, tokens, or internal hostnames in the prompt body.
- ❌ Translating Copilot's English output literally to Japanese. Summarize in natural Japanese.
- ❌ Retrying after a Bash timeout. Split or narrow the scope first.
- ❌ Promising the user that Copilot can fix / push / install through this skill. It is read-only.
