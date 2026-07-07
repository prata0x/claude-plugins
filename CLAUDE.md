# CLAUDE.md

Claude Code skills and agents, distributed as plugins
(`plugins/<plugin>/skills/<name>/SKILL.md`: ~100 line soft target per skill,
decision logic only — no boilerplate, no implementation detail) via a
Claude Code plugin marketplace (`.claude-plugin/marketplace.json`).
Also holds AI-agent security notes (`docs/`) referenced by the code-review
agents.

@.claude/vendor/universal.md
@.claude/vendor/product-repo.md

## Prompt design philosophy for AI agents

These are the rules that govern how skills (and any prompt-shaped artifact in this repo) are written. They reflect what the user has learned about steering AI agents and apply across every skill in this project.

### Discretion + alternatives beat absolute prohibitions

AI agents have strong goal-achievement bias. The more a prompt forbids, the harder the agent searches for workarounds — same dynamic as with humans. A wall of "do NOT" rules is the failure mode, not the safety net.

**How to write rules:**
- For every "do not X", supply a sanctioned ✅ alternative ("if X is truly needed, do Y and surface it in the report"). A prohibition with no escape valve gets silently circumvented.
- Prefer guidance with built-in escape valves (spike mode, explicit declaration, "ask the user") over flat bans.
- 縛り付けても良いことはない. A skill the model *wants* to follow beats a skill the model fights.

### Tight 仕様, loose 進め方

Distinguish what must be precisely shared from what is tactical:

- **仕様 (spec / definitions / vocabulary / success criteria)** — align tightly. Phase definitions, output formats, what counts as DONE: no ambiguity.
- **進め方 (how to proceed / tactical moves)** — give direction, leave discretion. The agent picks the path; the spec defines the destination.

Prescribing tactics produces brittle skills that break on edge cases the author did not foresee.

### Real enforcement is mechanical, not prompted

Prompts have no enforcement power. If a rule genuinely must hold, encode it in a mechanism — PreToolUse hook, lint, CI gate, type system, test. The prompt itself stays pure-guidance.

Do **not** include meta-notes like "a PreToolUse hook would enforce this" inside the user-facing SKILL.md — that is implementation-detail noise that wastes context. If a hook is needed, build the hook; the skill body stays focused on what the agent should do.

### 割り切り — accept residual bypass risk

Accept that some bypass risk remains in any pure-prompt skill. The trade is: lower bypass attempts (because the model is not gaming the prompt) in exchange for the absence of an absolute guarantee. For anything where the guarantee actually matters, see "Real enforcement is mechanical, not prompted" above (use a mechanism).

## Language rule for skills

Skill bodies default to English: Japanese tokens compress less efficiently,
and skill loading costs context that a skill's body pays with no payoff —
the body is read by Claude, not the user.

**Where Japanese is allowed:**
- Frontmatter `description:` — trigger phrases must literally match what the user utters.
- `When to invoke` section — trigger phrases verbatim; surrounding prose English.

**Where Japanese is NOT allowed:**
- Section headings, definitions, anti-patterns, workflows, critical rules, parenthetical glosses like `(definitions)`, inline phrases like `該当無し`.
- Template bodies that get written to files Claude later reads (e.g. the handoff template that becomes the next session's first prompt).

## Working norms

- **Do not create artifacts the user did not ask for.** No premature SKILL.md, no speculative refactors. Research first, propose, wait for go-ahead.
- **Copilot is read-only review.** Never ask Copilot to modify, fix, push, or install. The `copilot` skill enforces this; do not work around it.
- **Skills are decision logic, not tutorials.** ~100 lines, anti-pattern + alternative tables, workflow at a glance. If a section is restating what the agent already knows, cut it.
- **Reference, do not inline.** Point at `path:line` and commit SHAs; do not paste diffs or full file contents into skills or handoffs.
