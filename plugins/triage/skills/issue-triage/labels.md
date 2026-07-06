# issue-triage default labels

Only ask whether to create a missing label as part of the issue-creation
approval prompt (do not confirm label creation separately — one approval
gate covers both). If a label with the same name already exists in the
repo, use it as-is and never overwrite its color.

| Label | Color | Purpose |
|---|---|---|
| `security` | `5319E7` | finding sourced from security-audit |
| `comment` | `1D76DB` | finding sourced from comment-audit |
| `project` | `0E8A16` | finding sourced from project-audit |
| `severity:high` | `B60205` | severity high |
| `severity:medium` | `D93F0B` | severity medium |
| `severity:low` | `FBCA04` | severity low |

## Deriving severity

- `security-audit` / `project-audit` findings already carry `severity`,
  assigned by their own sub-agent — use it as-is.
- `comment-audit` findings carry no `severity`; derive it mechanically
  from `axis`: axis A → `high`, axis B → `medium`, axis C → `low`.
