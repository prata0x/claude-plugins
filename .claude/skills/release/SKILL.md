---
name: release
description: >
  Repo-local release skill for claude-plugins itself — not distributed as
  part of any plugin. Finds every plugin whose shipped files have changed
  since its `plugin.json` version was last set, decides a semver bump
  per plugin from the commit log, batches all pending bumps into one
  version-only PR, waits for CI, and merges automatically once green — no
  human confirmation gate on this merge, since the PR only ever rewrites
  version numbers for code that was already reviewed and merged
  separately. No git tags; the version field's own git history is the
  release record. Trigger phrases — "リリースして", "release the
  plugins", "/release". Optional argument: one or more plugin names to
  scope to (default: all plugins under `plugins/`).
disable-model-invocation: true
allowed-tools: Bash, Read, Edit, Grep, Glob
---

## Purpose

Keep each plugin's `plugin.json` version in sync with what's actually
shipped, so `claude plugin update` (which compares by version number, not
content) can detect real changes. A plugin whose files changed but whose
version never got bumped is invisible to `update` — this skill exists to
catch and fix that, on demand.

## When to invoke

Only on explicit `/release` or an explicit request ("リリースして",
"release the plugins"). This skill has `disable-model-invocation: true`
— never invoke it on your own judgment that "now would be a good time to
release." It also auto-merges without asking; that must only ever happen
because the user asked for it right now.

## Input

`$ARGUMENTS` optionally names one or more plugin names to scope to (e.g.
"second-opinion"). If empty, scan every directory under `plugins/`.

## Workflow

### 0. Preflight

- `git status --short` — must be clean. If not, stop and tell the user
  (do not stash or discard their work).
- `git branch --show-current` — must be `main` (or switch to it) and
  `git fetch origin && git pull` to be current.
- `gh auth status` — must be authenticated.

### 1. Per-plugin: find the last release point and diff since then

For each target plugin `<name>`:

```bash
FILE="plugins/<name>/.claude-plugin/plugin.json"
LINE=$(grep -n '"version"' "$FILE" | head -1 | cut -d: -f1)
COMMIT=$(git blame -L "$LINE,$LINE" --porcelain -- "$FILE" | head -1 | cut -d' ' -f1)
git log "$COMMIT"..HEAD --oneline -- "plugins/<name>/"
```

`COMMIT` is the commit that set the *current* version value — i.e. the
last release point, whether that was an explicit bump or the plugin's
original creation. If the log above is empty, this plugin has nothing
pending — skip it, no edit.

If it's non-empty, the shipped files have moved since the version was
last set. Read the full commit log in that range (not just `--oneline`)
to classify the bump:

- **major** — a skill/agent was removed or renamed, or a commit
  message/body explicitly signals a breaking change (`!:` or `BREAKING
  CHANGE` per conventional-commit convention). Rare — verify against the
  actual diff, don't infer from vague wording alone.
- **minor** — any `feat:` commit in range (new skill, new agent, new
  command, new capability) with no major signal.
- **patch** — everything else in range (`fix:`, `refactor:`, `docs:`,
  wording/doc changes, internal-only changes) with no minor/major signal.

If both a `feat:` and a `fix:` are in range, use minor (the higher of the
two). When genuinely ambiguous between two levels, pick the lower one —
under-bumping is cheap to correct next run; over-bumping is not.

### 2. Apply the bumps

For every plugin that needs one, `Edit` its `plugin.json` version field
only (semver bump per the classification above — patch: z+1, minor:
y+1/z=0, major: x+1/y=0/z=0). Do not touch any other file. Do not touch
`marketplace.json` or `README.md` — they don't carry per-plugin version
numbers.

If no plugin needs a bump, stop here and report "no pending release" —
do not create a branch or PR for a no-op.

### 3. Validate locally

Run the same checks CI runs, before pushing:

```bash
node scripts/build-agents.mjs && git diff --exit-code -- plugins/code-review/agents/ plugins/second-opinion/agents/
node scripts/build-plugins.mjs && git diff --exit-code -- plugins/
node scripts/security-pattern-check.mjs
claude plugin validate . --strict
```

A version-only change should never cause drift here; if it does, stop
and investigate rather than pushing a broken release PR.

### 4. Branch, commit, PR

- Branch: `release/<yyyy-mm-dd>` is fine (or any descriptive name) —
  timestamps here are just a branch name, not persisted prose.
- Commit only the changed `plugin.json` files.
- Commit message: `chore: release <plugin>@<version> (...)` listing each
  bumped plugin.
- Push, then `gh pr create` with a body listing, per plugin: old version
  → new version, bump level, and the actual commit subjects from step 1
  that justified it. Never state a reason not backed by a real commit in
  that range.

### 5. Wait for CI, then merge automatically

Poll `gh pr checks <n>` until every check reports a final state.

- **All green** → `gh pr merge <n> --merge --delete-branch` immediately.
  No confirmation step here — this is the one deliberate, scoped
  exception to this repo's normal "confirm before merge" rule, because
  this PR only ever rewrites version numbers for already-reviewed code.
- **Any check fails** → stop. Do not merge, do not retry, do not touch
  unrelated files to "fix" the failure — report the failing check to the
  user. A red CI is a real gate; the exception above is only for the
  human-confirmation step, not for CI passing.

### 6. Report

A table: plugin, old version, new version, bump reason, PR URL, merge
result. If nothing needed a release, say so plainly.

## Critical rules

- **Version-only PRs.** Never bundle a feature/fix into a release PR —
  those ship in their own PR first; this skill only ever moves the
  version number after the fact.
- **No git tags.** The version field's own git history (via `git blame`)
  is the single source of truth for "when did this ship" — don't
  introduce a second, parallel record that can drift out of sync with it.
- **Auto-merge is scoped to this skill, and to a green CI only.** Don't
  generalize "no confirmation needed" to any other skill or to a
  non-green run.
- **Never invoke this yourself.** `disable-model-invocation: true` — only
  ever run on an explicit user request.
- **No fabricated changelog entries.** Every bullet in the PR body must
  trace to an actual commit subject in the diffed range.

## Anti-patterns

| ❌ | ✅ |
|---|---|
| Bumping a plugin with zero commits since its last version-set commit | Skip it — nothing to release. |
| Creating a git tag after merge | Don't — the version field's git history already records this. |
| Merging with a failing check because "it's just a version bump" | Stop and report; only merge on green. |
| Bundling a code fix into the same commit as a version bump | Ship the fix first, release it separately. |
| Auto-invoking this after finishing an unrelated PR | Only run on explicit `/release`. |
| Writing a PR body bullet with no corresponding commit | Only describe what the commit log actually shows. |
