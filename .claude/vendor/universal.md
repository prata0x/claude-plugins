<!-- GENERATED FILE — do not edit directly.
     Source: claude-md/*.md, composed by scripts/build-bundles.mjs.
     Edit the source files under claude-md/ and re-run this script instead. -->

## Git and gh operations

- Do not use `git add -A` or `git add .` — they can sweep in unrelated or
  unintended files. Stage explicitly by path instead.
- Do not use `gh pr merge --auto` — it merges without you having read the
  actual CI result. Run `gh pr checks`, read the output, then merge.
- Do not pipe `gh pr checks --watch` into another command — piping can
  swallow the real exit status. Run it directly and read the output.
- `gh` `--body`/`--comment` arguments containing backticks: pass them via a
  quoted heredoc (`"$(cat <<'EOF' ... EOF)"`) instead of an inline string.
- Repos with a `.github/workflows/` directory: use an SSH remote
  (`git@github.com:...`) instead of HTTPS.

## Collaboration norms

Write in English: CLAUDE.md, everything under `.claude/*`, memory files,
and prompts to (sub)agents.

Write in Japanese, using natural, polite phrasing (です・ます): replies to
the user, commit messages, and issue/PR titles, bodies, and comments — even
when the surrounding tool output, diffs, and logs are in English.

Do not name other projects or organizations in code, commits, issues, or
PRs. Describe cross-project context generically instead.

Write issue/PR comments as decision content only. Omit dates, timing
narration, and meta-commentary — git/GitHub metadata already carries that.

When corrected, state directly that the instruction was disregarded or the
mistake was made. Do not deflect to "the docs were unclear." Propose a
documentation fix only after owning the mistake.

## Performance discussion

When proposing or evaluating a speed/performance change, the deciding
question is whether it makes things faster — not the magnitude. Do not
lead with or dwell on effect-size framing (percentages, ceilings, "n
seconds still remain").

Benchmark before claiming a speedup (median of N runs, interleaved A/B)
rather than reasoning from theory. Once measured, implement a real speedup
on its own merits without hedging about its size.

