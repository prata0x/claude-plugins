# AI臭監査 — <YYYY-MM-DD>

## スコープ
- 対象パス: <list or "リポジトリ全体">
- 対象文書数: <N>
- 実行した軸: A B C
- サブエージェントの状態: <e.g. 全文書完了 | fileX-A raw | fileY-B failed>

## 高信頼度の finding

(axis A を先頭に、次いで B・C の順で並べる)

### [axis A] file:location — 短い説明 (confidence: N)
引用: `...`
理由: 1行

### [axis B] file:location — 短い説明 (confidence: N)
引用: `...`
理由: 1行

### [axis C] file:location — 短い説明 (confidence: N)
引用: `...`
理由: 1行

## 生の軸出力
(いずれかの文書/軸がパース不能な出力を返した場合のみ — そのまま貼り付け、要約しない)

## サマリー
- フィルタ前のfinding数: <N>
- フィルタ後（80未満は除外）: <N>
- 軸別内訳: A <N> / B <N> / C <N>
- Rawだった文書: <list or "none">
- Failedだった文書: <list or "none">
