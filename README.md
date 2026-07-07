# claude-plugins

Claude Code plugin marketplace。個人用のClaude Codeスキル・エージェントを、
インストール可能なpluginとしてまとめたもの。

## 構成

- `.claude-plugin/marketplace.json` — marketplaceカタログ
- `plugins/` — plugin単位のディレクトリ。各々が独自の`skills/`・`agents/`・
  (あれば)`hooks/`を持つ
- `agents-src/` — `scripts/build-agents.mjs`が生成するcode-review・
  second-opinionエージェントのソース
- `docs/` — code-reviewエージェントが参照するAIエージェント向けセキュリティ
  参考資料
- `scripts/` — ビルドスクリプト(`build-agents.mjs`・`build-plugins.mjs`)と、
  それらが各pluginにコピーするleafスクリプト(`check-secrets.mjs`・
  `security-pattern-check.mjs`)
- `.claude/vendor/` — 姉妹リポジトリ
  [`claude-md-conventions`](https://github.com/prata0x/claude-md-conventions)
  からvendorした`universal.md` / `product-repo.md`(取得コマンドは向こうの
  `README.md`を参照)
- `.claude/skills/` — このリポジトリ自身の運用用スキル(配布pluginには含めない)。
  `release` — plugin毎のversionが実体に追いついているか確認し、必要なら
  bumpしてPR→CI green→自動マージするリリーススキル

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
| `second-opinion` | read-onlyのレビュー・調査タスクをGitHub Copilot CLI / OpenAI Codex CLIに委任、copilot→codex→opusの自律fallbackチェーンでセカンドオピニオンを取得、または`/fable`・`/opus`で特定タスクをFable/Opusに単発で相談 | `claude plugin install second-opinion@prata0x-plugins` |
| `align` | 実装前のすり合わせ・spec sketchスキル | `claude plugin install align@prata0x-plugins` |
| `comment` | staged追加分のstale-riskなコメントパターンをブロックするpre-commit hook、およびhookのregexでは拾えない漏洩・ナレーション系問題を確認する不定期実行のcomment-audit監査スキル | `claude plugin install comment@prata0x-plugins` |
| `project` | プロジェクト全体の課題発見監査スキル・エージェント(AIエージェントの作業障害＋利用者視点の product gap) | `claude plugin install project@prata0x-plugins` |
| `triage` | security-audit/comment-audit/project-auditの高信頼度findingを検証・重複確認した上でGitHub issue化するスキル・エージェント(実行前に承認確認あり) | `claude plugin install triage@prata0x-plugins` |
| `response-quality` | 最終応答が日本語で書かれているか、focusモードで隠れた中間出力への後方参照が残っていないかをモデル判定するStop hook(`type: "prompt"`) | `claude plugin install response-quality@prata0x-plugins` |
| `notify-sound` | WSL/Windows環境向けに、ターン終了時・AskUserQuestion待機時にpowershell.exe経由で通知音を鳴らすhook | `claude plugin install notify-sound@prata0x-plugins` |

## CI

`ci.yml`で以下を1ジョブにまとめて実行:

- `.github/workflows`配下のactionが40桁commit SHAでpinされているか
- `plugins/`が`agents-src/*.md`や`scripts/*`から乖離していないか(drift検知)
- リポジトリ全体を対象にした機械的セキュリティパターンスキャン
- `claude plugin validate . --strict`によるplugin manifestの構造検証

`codeql.yml` — JavaScriptに対するCodeQL解析(push/PR/週次)。`dependabot.yml`
— `github-actions`エコシステムのpin更新のみ(週次・グループ化)。
