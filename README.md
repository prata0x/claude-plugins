# claude-plugins

Claude Code plugin marketplace。個人用のClaude Codeスキル・エージェントを、
インストール可能なpluginとしてまとめたもの。

## 構成

- `.claude-plugin/marketplace.json` — marketplaceカタログ
- `plugins/` — plugin単位のディレクトリ。各々が独自の`skills/`・`agents/`・
  (あれば)`hooks/`を持つ
- `agents-src/` — `scripts/build-agents.mjs`が生成するsecond-opinion
  エージェントのソース
- `docs/` — AIエージェント向けセキュリティ参考資料
- `scripts/` — ビルドスクリプト(`build-agents.mjs`・`build-plugins.mjs`)と、
  それらが各pluginにコピーするleafスクリプト(`check-secrets.mjs`)
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
| `second-opinion` | read-onlyのレビュー・調査タスクをGitHub Copilot CLI / OpenAI Codex CLIに委任、copilot→codex→opusの自律fallbackチェーンでセカンドオピニオンを取得、または`/fable`・`/opus`で特定タスクをFable/Opusに単発で相談 | `claude plugin install second-opinion@prata0x-plugins` |
| `align` | 実装前のすり合わせ・spec sketchスキル | `claude plugin install align@prata0x-plugins` |
| `audit` | プロジェクト全体を対象にした不定期実行の監査スキル群(comment-audit・project-audit・security-audit)と、それらの高信頼度findingを検証・重複確認した上でGitHub issue化するissue-triageスキル。hookは持たず、commit時の機械的ゲートは行わない | `claude plugin install audit@prata0x-plugins` |
| `adversarial-review` | 呼び出し時に指定したdiff範囲を対象に、correctness/regressions・design/maintainability・test coverageの3軸scannerを並列実行し、confidence-filterでスコアリングする深掘りレビュースキル。deploy前など、通常の`reviewer`より高い精度が必要な場面向け | `claude plugin install adversarial-review@prata0x-plugins` |
| `response-quality` | 最終応答が日本語で書かれているかをモデル判定するStop hook(`type: "prompt"`) | `claude plugin install response-quality@prata0x-plugins` |
| `notify-sound` | WSL/Windows環境向けに、ターン終了時・AskUserQuestion待機時にpowershell.exe経由で通知音を鳴らすhook | `claude plugin install notify-sound@prata0x-plugins` |
| `writing` | 技術文書・ブログ記事(汎用/AI一人称)・開発成果物(commit/PR/issue)・changelog・議事録・翻訳それぞれの執筆ガイドスキル(いずれもAI生成っぽい定型表現を防ぐチェックを内蔵)。加えて*.md編集前のcontext注入hook、定型フレーズを検出するpost-edit機械的hook、辞書では拾えない意味的な問題(書き手の不在・構造的単調さ・定型表現の言い換え)を確認する不定期実行の監査スキル | `claude plugin install writing@prata0x-plugins` |

## CI

`ci.yml`で以下を1ジョブにまとめて実行:

- `.github/workflows`配下のactionが40桁commit SHAでpinされているか
- `plugins/`が`agents-src/*.md`や`scripts/*`から乖離していないか(drift検知)
- リポジトリ全体を対象にした機械的セキュリティパターンスキャン
- `claude plugin validate . --strict`によるplugin manifestの構造検証

`codeql.yml` — JavaScriptに対するCodeQL解析(push/PR/週次)。`dependabot.yml`
— `github-actions`エコシステムのpin更新のみ(週次・グループ化)。
