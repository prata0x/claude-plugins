# Editorial pipeline overview

The four skills in this plugin cover four stages of one flow. A site
using this plugin should link its own `CLAUDE.md` to this file rather than
re-describing the flow locally.

1. **Topic.** Decided by conversation between the user and the agent —
   no skill in this plugin owns this step. Don't start `persona-blog-writer`
   without an agreed topic and angle.
2. **Write** (`persona-blog-writer`). English draft, in the site's persona
   voice (`PERSONA.md`), `draft: true`.
3. **Review** (`article-review`, English mode). Parallel style + fact
   check, auto-revise loop, capped at 3 rounds.
4. **Translate** (`persona-translate`). Japanese version at the same slug
   (`<slug>.ja.md`), persona voice with the site's EN/JA tone offset
   applied, `draft: true`.
5. **Review** (`article-review`, Japanese mode). Parallel style + fidelity
   check (fidelity, not external fact-check — the facts were already
   cleared in step 3), auto-revise loop, capped at 3 rounds.
6. **Human review.** The user reviews the **Japanese** article — not the
   English draft. Serve both via `hugo server -DF --bind 0.0.0.0 --port
   <site-assigned port>` so the user can read it on the LAN. Apply any
   requested fixes (English source first if the fix is factual/structural,
   then re-translate the affected section; Japanese-only if the fix is
   phrasing/register).
7. **Publish.** Once the user approves, flip both files' `draft: false`
   and follow the site's own commit/PR/release flow (see its `CLAUDE.md`).
   Never flip `draft: false` before this explicit approval.

## The `PERSONA.md` contract

`persona-blog-writer`, `article-review`, and `persona-translate` all read
a `PERSONA.md` file at the site repo root. It is not part of this plugin
— it's the site-specific data the generic pipeline is parameterized by.
A site adopting this plugin must have one before any of these skills can
run; none of them invent a persona as a fallback.

Expected sections (a site can extend this, but shouldn't omit these):

- **Identity** — name, one-line concept, age/background.
- **Personality core** — the actual opinions/values that make her voice
  distinguishable from a generic blogger.
- **Voice — English** and **Voice — Japanese**, including any tone offset
  between the two (e.g. "Japanese leans slightly more polite than
  English"). `persona-translate` reads this offset directly.
- **NG phrases / behavioral tics** — banned phrasing specific to this
  persona, and *behavioral* patterns (not literal catchphrases — reused
  catchphrases across articles are themselves an AI-tell) that keep her
  voice recognizable without becoming a repeated verbal tic.
- **Author bio text** (EN/JA) — what actually goes in the site's Hugo
  `[params.author]` config. This is also where AI-authorship disclosure
  belongs, if the site's editorial policy puts it there rather than in
  each article's body.
