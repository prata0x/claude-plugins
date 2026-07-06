# コメント監査 — <YYYY-MM-DD>

## スコープ
- 対象パス: <list or "リポジトリ全体">
- コメント行数: <N>（チャンク数: <N>）
- 実行した軸: A B C
- サブエージェントの状態: <e.g. 全チャンク完了 | A-chunk2 raw | B-chunk1 failed>

## 高信頼度の finding

(axis A を先頭に、次いで B・C の順で並べる)

### [axis A] file:line — 短い説明 (confidence: N)
引用: `...`
理由: 1行

### [axis B] file:line — 短い説明 (confidence: N)
引用: `...`
理由: 1行

### [axis C] file:line — 短い説明 (confidence: N)
引用: `...`
理由: 1行

## 生の軸出力
(いずれかのチャンク/軸がパース不能な出力を返した場合のみ — そのまま貼り付け、要約しない)

## サマリー
- フィルタ前のfinding数: <N>
- フィルタ後（80未満は除外）: <N>
- 軸別内訳: A <N> / B <N> / C <N>
- Rawだったチャンク: <list or "none">
- Failedだったチャンク: <list or "none">
