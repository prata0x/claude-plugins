// 共有のシークレット検出パターン。呼び出し元同士でパターンリストがずれないよう、
// ここを唯一の情報源とする。

export const SECRET_PATTERNS = [
  // key/password/token = <16文字以上の値>
  /(api[_-]?key|secret[_-]?key|password|access[_-]?token|aws_secret_access_key|private[_-]?key)\s*[=:]\s*["'`]?[A-Za-z0-9_/+=-]{16,}/i,
  // Bearer <token>(HTTP Authorizationヘッダ形式)
  /(^|[^A-Za-z])bearer\s+["'`]?[A-Za-z0-9_/+.=-]{20,}/i,
  // Anthropic / OpenAI 形式: sk-... または sk-ant-...
  /sk-(ant-)?[A-Za-z0-9_-]{20,}/i,
  // GitHubのpersonal access / OAuth / refresh / server / userトークン
  /gh[ousrp]_[A-Za-z0-9]{30,}/i,
  // AWSアクセスキーID
  /AKIA[0-9A-Z]{16}/i,
  // Slackトークン
  /xox[abprs]-[A-Za-z0-9-]{20,}/i,
  // PEM形式の秘密鍵
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/i,
]

// ファイル全体を1つの文字列としてではなく1行ずつ判定する。bearerトークンの
// パターンにある `(^|...)` アンカーが、grepが1行ずつ処理するのと同じ挙動に
// なるようにするため。最初にマッチしたパターンを返す。クリーンなら null。
export function findSecretPattern(text) {
  const lines = Array.isArray(text) ? text : text.split('\n')
  for (const pattern of SECRET_PATTERNS) {
    if (lines.some((line) => pattern.test(line))) return pattern
  }
  return null
}
