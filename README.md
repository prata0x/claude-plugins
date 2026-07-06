# claude-plugins

Claude Code plugin marketplace。個人用のClaude Codeスキル・エージェントを、
インストール可能なpluginとしてまとめたもの。

## 構成

- `.claude-plugin/marketplace.json` — marketplaceカタログ
- `plugins/` — plugin単位のディレクトリ。各々が独自の`skills/`・`agents/`・
  (あれば)`hooks/`を持つ
- `agents-src/` — `scripts/build-agents.mjs`が生成するcode-reviewエージェント
  のソース
- `docs/` — code-reviewエージェントが参照するAIエージェント向けセキュリティ
  参考資料
- `scripts/` — ビルドスクリプト(`build-agents.mjs`・`build-plugins.mjs`)と、
  それらが各pluginにコピーするleafスクリプト(`check-secrets.mjs`・
  `security-pattern-check.mjs`)
- `.claude/vendor/` — 姉妹リポジトリ
  [`claude-md-conventions`](https://github.com/prata0x/claude-md-conventions)
  からvendorした`universal.md` / `product-repo.md`(取得コマンドは向こうの
  `README.md`を参照)

## インストール

```sh
claude plugin marketplace add prata0x/claude-plugins
claude plugin install <plugin名>@prata0x-plugins
```

## Plugin一覧

| Plugin | 説明 | インストール |
|---|---|---|
| `tdd` | test-first (red-green-refactor) の実装フロースキル | `claude plugin install tdd@prata0x-plugins` |
| `code-review` | pre-commit / pre-mergeのコードレビュースキル・エージェント | `claude plugin install code-review@prata0x-plugins` |
| `handoff` | セッションの引き継ぎ・再開スキル | `claude plugin install handoff@prata0x-plugins` |
| `security` | プロジェクト全体のセキュリティ監査スキル・エージェント、およびcommit時の機械的セキュリティパターンhook | `claude plugin install security@prata0x-plugins` |
| `second-opinion` | read-onlyのレビュー・調査タスクをGitHub Copilot CLI / OpenAI Codex CLIに委任、またはcopilot→codex→opusの自律fallbackチェーンでセカンドオピニオンを取得 | `claude plugin install second-opinion@prata0x-plugins` |
| `align` | 実装前のすり合わせ・spec sketchスキル | `claude plugin install align@prata0x-plugins` |
| `comment` | staged追加分のstale-riskなコメントパターンをブロックするpre-commit hook、およびhookのregexでは拾えない漏洩・ナレーション系問題を確認する不定期実行のcomment-audit監査スキル | `claude plugin install comment@prata0x-plugins` |

## CI

`ci.yml`で以下を1ジョブにまとめて実行:

- `.github/workflows`配下のactionが40桁commit SHAでpinされているか
- `plugins/`が`agents-src/*.md`や`scripts/*`から乖離していないか(drift検知)
- リポジトリ全体を対象にした機械的セキュリティパターンスキャン
- `claude plugin validate . --strict`によるplugin manifestの構造検証

`codeql.yml` — JavaScriptに対するCodeQL解析(push/PR/週次)。`dependabot.yml`
— `github-actions`エコシステムのpin更新のみ(週次・グループ化)。
