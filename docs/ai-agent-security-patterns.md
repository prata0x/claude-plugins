# AI agent が security の地雷を踏みがちなパターン集

96 件の security issue (2026-05-20〜06-03) を AI agent の失敗パターン軸で分類したもの。ほぼ全件が **「楽な選択肢を選ぶ／happy path しか想定しない／とりあえず動かす」** の 3 系統に集約される。

---

## マルチテナント境界の欠落 (最頻出 / 約 25 件)

> AI は単一テナントを前提にコードを書き、「組織ID で絞る」「リソースの所有者を確認する」ステップを忘れる。Lambda / Resolver / handler の入口で `where { organizationId: ctx.user.orgId }` 等を自動で挟む発想が弱い。

**徹底すること**
- すべての list / get / update / delete に `tenantId` / `orgId` / `branchId` のスコープ条件を必ず付ける。**省略はバグとして扱う**。
- クライアントから受け取った `userId` / `targetUserId` / `slideId` 等は **必ずアクセス側の所属組織と一致するかを別クエリで検証**してから使う。
- AppSync `allow: private` / Cognito 認証済み = 認可ではない。テナント分離は別途必要。
- WebSocket / pub-sub のメッセージ送信先 (`channel`, `room`) は **DB 側で参加者かを再検証**してからブロードキャストする。クライアント指定を信頼しない。
- 「export」「report」「admin-」が付く関数は IDOR の温床。必ずレビューする。

## ワイルドカード / "*" による「とりあえず通す」設定

> AI は CORS / S3 / postMessage / CSP で `'*'` を選びがち。「動かないより動く方がマシ」のバイアス。

**徹底すること**
- CORS `allowedOrigins`, S3 バケット CORS, `postMessage` の `targetOrigin`, CSP `frame-ancestors` に **`'*'` を書かない**。許可リスト方式で明示する。
- 認証付き API の CORS は特に NG。Cookie / Authorization が乗る経路で `'*'` は実質オープン。
- 「dev で楽するため」`'*'` を書いた場合、`if (process.env.NODE_ENV !== 'production')` ガードを必ず添える。

## AdministratorAccess / `Resource: "*"` / `dynamodb:*` を選ぶ IAM

> AI は権限エラーを潰すために IAM ポリシーを広げる方向に動く。最小権限は思考コストが高いのでスキップされる。

**徹底すること**
- デプロイロール / Lambda 実行ロールに `AdministratorAccess` / `*Access` 系の AWS マネージドポリシーを付けない。
- `Action: "*"` も `Resource: "*"` も **両方同時に書かない**。少なくとも片方を狭める。
- 必要な API call が分からない時は `ReadOnlyAccess` で始めて、不足を CloudTrail で見ながら足す。最初から広げない。

## `Math.random()` を暗号用途に使う

> AI は「ランダム ID」要件に対して `Math.random()` / `Date.now()` を反射的に使う。CSPRNG への切替を自発的にしない。

**徹底すること**
- 共有リンクトークン, セッション ID, リソース ID (主キー), パスワードリセットトークン, CSRF トークンに `Math.random()` / `Date.now()` を使わない。
- Node: `crypto.randomUUID()` / `crypto.randomBytes()`、Web: `crypto.getRandomValues()`、Go: `crypto/rand` を使う。
- ID 生成器が `Math.random` を含んでいたら **暗号文脈で使われていないか必ず確認**してから採用。

## シークレットをコミット / バンドル / ログに混入

> AI は「.env.example を埋めて見やすくする」「ログに全部出してデバッグしやすくする」志向が強く、シークレットの境界が崩れがち。

**徹底すること**
- ハードコード禁止: OAuth client secret, API key, JWT 秘密鍵, VAPID 秘密鍵, LiveKit secret 等。
- Next.js: `next.config.ts` の `env: {}` は **クライアントバンドルに焼き付く**。サーバ秘密を絶対に置かない。`process.env` を使うのはサーバコンポーネント側だけ。
- `.env.example` に実在のメールアドレス / 実在の URL / placeholder と紛らわしい本物の値を書かない。
- 生成スクリプトが秘密鍵を **stdout に echo しない**。ファイル書き出し + `chmod 600`。
- CloudFormation/CDK で `unsafeUnwrap()` 等で平文展開しない。Secret 参照のまま渡す。
- ログに DynamoDB の全レコード / API Gateway event 全体 / Cognito JWT を出さない。**ログには ID と要約だけ**。
- `JWT_SECRET || ''` のようなフォールバックを書かない。**起動時に空ならクラッシュさせる**。
- CLAUDE.md / README に「認証情報の取得方法・置き場所」を書かない (= 攻撃者へのガイドになる)。

## スタブのまま本番に行く

> AI は「あとで実装」のつもりで `return true` / `// TODO: verify` の状態でコミットし、そのままビルド → デプロイされる。

**徹底すること**
- `verifyIdToken`, `verifySignature`, `authorize`, `isAdmin` 系の関数を **`true` 固定 / 未実装で merge しない**。
- 未実装の認証/認可関数は throw させて起動を止める。silent な true を返さない。
- PR で `// TODO` / `// FIXME` / `unimplemented` が security 関連識別子の近くにある場合はブロッカー扱い。

## Edge / WAF を迂回する直接公開

> AI は「CloudFront 経由で動かす」設計を忘れ、Lambda Function URL / ALB を直に公開して機能を満たしてしまう。

**徹底すること**
- Lambda Function URL `authType: NONE` を **インターネット公開しない**。CloudFront 経由のみ許可するなら `IAM` + OAC、または共有 secret header を Lambda 側で検証。
- ALB をオリジンにする場合、ALB に **HTTPS listener を必ず立てる**。CloudFront→オリジン間 HTTP は中間 NW 盗聴 / SSRF で抜ける。
- 「とりあえず Function URL で公開」「とりあえず ALB は HTTP」を完成形にしない。

## 認証 / セッションの自前実装

> AI は「シンプルに」セッション Cookie を書こうとして JSON 直書き / 署名なし / Secure フラグ条件付き、になりがち。

**徹底すること**
- セッション Cookie は **署名 (HMAC) または暗号化必須**。生 JSON を Cookie に書かない。
- `Set-Cookie`: `Secure; HttpOnly; SameSite=Lax|Strict` を常に。`Secure` を `$_SERVER['HTTPS']` 等のリクエスト変数だけで判断しない (リバプロ配下で偽装可)。
- ログアウト時は **サーバ側で失効**できる仕組みにする (Bearer token を localStorage に置きっぱなしで「ログアウト = JS で消す」は失効ではない)。
- Cognito の `userPassword (ALLOW_USER_PASSWORD_AUTH)` 等の非 SRP フローを本番で有効にしない。
- ID token / アクセストークンを **URL クエリ文字列に乗せない** (履歴 / リファラ / アクセスログに残る)。WebSocket でも URL ではなく初回メッセージ or Sec-WebSocket-Protocol で渡す。

## 外部 Webhook / コールバックの署名検証忘れ

> AI は Twilio / Stripe / GitHub などの inbound webhook ハンドラを「受け取って処理する」だけで書きがち。署名検証が抜ける。

**徹底すること**
- inbound webhook は **必ず provider 提供の署名検証関数を通す**。`X-Twilio-Signature`, `Stripe-Signature`, `X-Hub-Signature-256` etc.
- 検証は handler の **一番上**。検証なしで body をパースしない。
- callbackUrl / redirectUrl / returnTo 等の URL は **許可リストの host とのみ一致**を確認してからリダイレクトする (open redirect)。

## レスポンスヘッダ / セキュリティヘッダの欠落

> AI は機能要件を満たすと終わる。CSP / X-Frame-Options / HSTS / Referrer-Policy などを自発的に付けない。

**徹底すること**
- 最低限: `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options` (or CSP `frame-ancestors`)。
- Next.js は `next.config.js` `headers()` か middleware で、Lambda@Edge / CloudFront Functions の Response policy で適用。「実装場所がない」は理由にならない。
- CSP `frame-ancestors` を `*` にしない。埋め込み先ドメインを列挙する。

## GitHub Actions の supply chain

> AI はワークフローを「動く形」で書く。SHA pinning / permissions block / Dependabot は省略される。

**徹底すること**
- 第三者 action は **コミット SHA で pin** する (`@v4` ではなく `@<40 桁 SHA>`)。同時に `# v4.1.7` のコメントを添える。
- ワークフロー先頭で **`permissions:` を最小化**。デフォルトの広い token を使わない。
- `workflow_dispatch` の `inputs.*` は **シェルに直接展開しない**。必ず `env:` 経由で受け、`"$INPUT"` でクォート。SSH 越しに渡すなら追加で `printf %q`。
- migration / production deploy step に `continue-on-error: true` を付けない (失敗を握り潰す)。
- Dependabot / Renovate を **新規プロジェクト作成時の初期化で必ず有効化**。後付けは忘れられる。

## クライアント側の信頼

> AI は UI とサーバを同時に書くので、UI 側のバリデーションをサーバ側のバリデーションと混同しがち。

**徹底すること**
- 価格 / 数量 / 割引 / ロール / 権限フラグ をクライアントから受け取って **そのまま DB に書かない**。サーバ側で再計算 / 再判定。
- 「削除確認は modal を出すから OK」ではなく、削除 API 側で **サーバ権限チェック + 監査ログ書き込み**。クライアント側 modal はガードではない。
- 管理パスワード / token を `localStorage` / `sessionStorage` に **平文保存しない**。HttpOnly Cookie に。

## インジェクション系の素朴な失敗

> AI は文字列結合と `execSync` を抵抗なく使う。テンプレートを差し込むタイプの XSS / コマンドインジェクションが入りやすい。

**徹底すること**
- `execSync(`...${userInput}...`)` / `spawn('sh', ['-c', ...])` で **ユーザ入力 / workflow input を文字列展開しない**。引数配列で渡す or `printf %q` でクォート。
- DOM 注入: `innerHTML` / `dangerouslySetInnerHTML` / tooltip / popover で **DB から取得した文字列をそのまま埋めない**。テキストノードとして挿入する or DOMPurify。
- ファイルパス: `path.join(BASE, userInput)` の後に `path.resolve` で **`BASE` の prefix チェック**を必ずする。`..` を弾くだけでは不十分。
- HTML 属性に出す URL は `^https?:` (場合により `mailto:` / `tel:`) のみ許可。`javascript:` / `data:` を弾く。
- iframe の `sandbox` に `allow-same-origin` と `allow-scripts` を **同時に付けない** (XSS と等価になる)。

## SSRF / 内部リソースへの誘導

> AI は「URL を受け取ってフェッチする」要件で素直に `fetch(userUrl)` を書きがち。

**徹底すること**
- ユーザ提供 URL を fetch する前に: **ホスト名解決 → IP がプライベート/loopback/link-local/メタデータ (`169.254.169.254`) でないことを確認**。redirect も追跡して再検証。
- 「フェッチして展開して埋め込む」(iframe-check / OGP / 画像プロキシ) は SSRF の温床。**必ず認証必須にする + allowlist host にする + 内部 IP を弾く**。
- 「未認証で URL を取って何かする」エンドポイントを作るときは、まず「これは SSRF か?」を自問する。

## 暗号アルゴリズム / 比較の誤用

> AI は名前ベースで API を選ぶ ("HKDF と書いてあるから OK") / 文字列比較で `===` を使う。

**徹底すること**
- 「ECDH の共有秘密をそのまま AES 鍵に使う」ことはしない。必ず **HKDF / PBKDF2 で派生**。コメントで HKDF と書いても実装が違えば意味なし。
- 秘密値の比較は **constant-time** で。Node: `crypto.timingSafeEqual()`、Go: `subtle.ConstantTimeCompare`。`a === b` / `strcmp` / `Buffer.compare` は使わない。
- `if (a.length !== b.length) return false` の早期 return は **長さリーク**になる。timingSafeEqual に直接渡す (長さが違うと throw する → 上位で catch して reject)。

## 改ざん可能な audit log / 不可逆操作

> AI は AppSync / Firestore rules で AuditLog にも他テーブルと同じ CRUD を許可する。「監査」の意味が落ちる。

**徹底すること**
- AuditLog / 監査用テーブルは **append-only**。`update` / `delete` を IAM / rules レベルで禁止。
- 不可逆操作 (一括 purge / 大量削除) は: ①サーバ側で再認可、②2 段階確認 (チャレンジ文字列を type させる)、③監査ログ書き込み、④可能なら soft delete。クライアント confirm モーダルだけに頼らない。
- S3 のデータ保持バケット (給与・税・法定書類) は **versioning + Object Lock**。誤削除 / ランサムウェアに備える。

## 環境スイッチが production に漏れる

> AI は「dev で楽するため」`DISABLE_RATE_LIMITING` / `SKIP_AUTH` / `MOCK_PAYMENT` のような env を作りがち。production にそのまま入ると即事故。

**徹底すること**
- 「安全側を緩めるフラグ」は `if (env === 'production' && flag) panic()` で **起動を止める**。
- フラグの default 値は安全側 (rate limiting ON / auth ON)。「未設定 = 無効」にしない。
- seed / fixture スクリプトに **本番でも通る default password** のアカウントを作らない。`if (env === 'production') throw` を入れる。

## エラー詳細 / debug 経路がそのまま公開される

> AI はデバッグしやすさのために stack trace / SQL error を返しがち。debug alias を残しがち。

**徹底すること**
- Lambda / handler の最外殻 catch で、**外向きには汎用メッセージ + request id**、内向き (ログ) には詳細、を分ける。
- `GET = POST` の debug alias を残さない。CORS preflight が要らないだけで、認証認可は別問題。
- reCAPTCHA / 外部 anti-abuse の検証は fail-**closed**。例外時にスコアを「通す側」に倒さない。

## 依存とランタイムの放置

> AI は package 追加はするが、脆弱性追跡や renew の仕組みは自発的に作らない。

**徹底すること**
- 新規プロジェクトに **Dependabot or Renovate を初期コミットで入れる**。
- イメージ処理系 (ImageSharp, ImageMagick, libvips, sharp) はゼロデイ頻発。**SBOM + 自動 PR + CI で `npm audit` / `dotnet list package --vulnerable` を必須に**。
- supply chain 系 (npm install スクリプト, postinstall) を新規追加するときは内容を必ず読む。

## 「最後の砦」の前提を疑う

> AI は「Cognito 認証あるから OK」「VPC 内だから OK」「CloudFront 経由だから OK」と layer の存在で安心しがち。一段抜けると裸になる構造を書きがち。

**徹底すること**
- 「**この経路を 1 枚剥がしたら何が起きるか?**」を毎回問う。Cognito だけで認可していないか / Function URL を直で叩かれたら何が漏れるか / WAF が無効なら何が通るか。
- 防御は重ねる。**「認証 = 認可」「edge = 認可」と短絡しない**。各 handler で独立に再判定する。
