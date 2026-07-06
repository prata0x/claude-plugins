# issue-triage 既定ラベル

未作成の場合のみ、issue作成の承認プロンプトの中で「作成しますか」を尋ねる
（作成自体を別途確認しない — 一つの承認ゲートにまとめる）。既に同名ラベルが
存在する場合はそれをそのまま使い、色を上書きしない。

| ラベル | 色 | 用途 |
|---|---|---|
| `security` | `5319E7` | security-audit由来のfinding |
| `comment` | `1D76DB` | comment-audit由来のfinding |
| `project` | `0E8A16` | project-audit由来のfinding |
| `severity:high` | `B60205` | 重要度high |
| `severity:medium` | `D93F0B` | 重要度medium |
| `severity:low` | `FBCA04` | 重要度low |

## severityの導出

- security-audit / project-audit のfindingは `severity` を自身のsub-agentが
  直接付与済み — そのまま使う。
- comment-auditのfindingには `severity` が無い。axisから機械的に導出する:
  axis A → `high`、axis B → `medium`、axis C → `low`。
