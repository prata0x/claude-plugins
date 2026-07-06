# AI agent 向け security チェックリスト

96 件の security issue (2026-05-20〜06-03) から抽出した、AI agent がコーディング時に踏みがちな地雷の凝縮版。詳細版は [ai-agent-security-patterns.md](./ai-agent-security-patterns.md)。

- 全 query/handler に `tenantId`/`orgId`/`userId` のスコープ条件を必ず付ける。クライアント指定 ID は所属組織と一致するか別途検証してから使う。
- CORS / S3 / postMessage / CSP `frame-ancestors` に `'*'` を書かない。allowlist で明示する。
- IAM で `AdministratorAccess` を使わない。`Action` と `Resource` の両方を `'*'` にしない。
- ID/token/session には `Math.random()` / `Date.now()` を使わない。`crypto.randomUUID` / `randomBytes` / `getRandomValues` を使う。
- 秘密値の比較は `timingSafeEqual`。ECDH 共有秘密は HKDF で派生してから使う。「HKDF と書いてあるが実装は違う」を疑う。
- シークレットをハードコード/コミット/バンドル/ログに混入させない。`next.config.ts` の `env{}` はクライアントに焼き付く。ログに event/record 全体を出さない。`JWT_SECRET` 等のフォールバックは空ではなく throw。
- 認証/認可関数を未実装スタブ (`return true` / `TODO`) のまま merge しない。
- Lambda Function URL `authType:NONE` をインターネット公開しない。ALB オリジンは HTTPS。edge/WAF を迂回する経路を作らない。
- Session Cookie は署名 or 暗号化必須。`Secure`/`HttpOnly`/`SameSite` を常に設定。Bearer を localStorage に置きっぱなしの「JS で消すログアウト」は失効ではない。token を URL に乗せない。
- inbound webhook (Twilio/Stripe/GitHub 等) は handler 先頭で署名検証。`callbackUrl`/`redirectUrl` は host allowlist で検証 (open redirect)。
- CSP / HSTS / `X-Content-Type-Options` / `Referrer-Policy` / `X-Frame-Options` を常に設定する。
- GH Actions: 第三者 action は SHA pin、workflow 先頭で `permissions` を最小化、`workflow_dispatch` input は env 経由でクォート、production step に `continue-on-error: true` を付けない。
- 価格/数量/ロール/権限フラグ をクライアントから受けてそのまま書かない。サーバで再計算/再判定。削除確認はサーバ側で再認可。
- `innerHTML` / `dangerouslySetInnerHTML` / tooltip に DB 文字列を素で入れない。path は resolve 後に BASE prefix 検証。`execSync` は引数配列で渡す。href の `javascript:`/`data:` を弾く。iframe sandbox に `allow-same-origin` と `allow-scripts` を同時指定しない。
- ユーザ提供 URL を fetch する前にホスト解決し、private/loopback/link-local/`169.254.169.254` を弾く。redirect も再検証。
- AuditLog は append-only (update/delete を禁止)。不可逆操作はサーバ再認可+二段階確認+監査記録。保持バケットは versioning + Object Lock。
- 「安全側を緩めるフラグ」(`DISABLE_RATE_LIMITING` 等) は production で起動を止める。default は安全側。seed の特権アカウントに default password を残さない。
- 例外時の外向きエラーは汎用メッセージ+request id のみ。debug 用 `GET=POST` alias を残さない。reCAPTCHA は fail-closed。
- 新規 repo の初期コミットで Dependabot/Renovate を入れる。画像処理系 (ImageSharp/sharp/libvips) は脆弱性追跡を CI 必須に。
- 「認証 = 認可」「edge 経由 = 安全」と短絡しない。一段抜けたら何が漏れるかを毎回問う。各 handler で独立に再判定する。
