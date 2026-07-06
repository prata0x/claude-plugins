---
name: tdd
description: >
  Drive Claude's implementation flow with red → green → refactor — write a
  failing test first, make it pass with the minimum implementation, then
  refactor. Trigger phrases — "TDD で実装", "red-green で進めて",
  "TDD モードで", "test-first で書いて", "/tdd",
  "implement this TDD", "do this test-first". Do NOT invoke for pure
  exploration / research / mechanical migration — TDD is a poor fit there.
  Language-agnostic; auto-detects the test runner from project state.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

## Purpose

Drive implementation as red → green → refactor with explicit escape valves: spike mode, one-line refactor opt-out, justified pre-existing test edits.

## When to invoke

Trigger when the user wants the implementation done test-first:

- 「TDD で実装」「TDD モードで」「red-green で進めて」「test-first で書いて」
- 「/tdd」
- "implement this TDD", "do this test-first"

Do NOT invoke when:

- The user is doing pure exploration / research with no production code target — TDD has no test to drive.
- Mechanical migration / refactor with no behavior change.
- The task is reading / investigating / debugging existing code rather than implementing new behavior.
- The user wants a quick prototype and has not asked for TDD.

## Definitions

- **RED** — the test runner reports the new test as `fail`. A compile / import error or "test not found" does NOT count as RED; fix until the runner can actually execute the test and produce a failed assertion. If the fix incidentally causes the assertion to pass (accidental GREEN), strengthen the assertion until a real RED is observed before continuing.
- **GREEN** — the new test passes AND the rest of the suite is unchanged (no new failures, no newly skipped pre-existing tests). If a previously-failing pre-existing test now unexpectedly passes, surface it — the slice may have reached further than intended.
- **REFACTOR** — structural improvement while every test stays green. Adding *behavioral* tests or changing observable behavior is NOT refactor; that opens the next RED. (Adding internal test helpers / fixtures during refactor is fine.)
- **Slice** — one observable behavior: one function, one endpoint, one UI interaction. If a slice feels large, that is a split signal, not a "make the test bigger" signal.
- **Spike mode** — explicitly stepping outside TDD to learn an unknown (API shape, library behavior, data format). Declaring a spike is legitimate; silently spiking under a TDD banner is not.

## Direction

Direction with discretion. If you deviate from a step, declare it.

1. **Detect the test runner** from project signals, priority order:
   - `.github/workflows/*.yml` (or other CI config) test step — ground truth where present.
   - Lockfile-confirmed dev dependency: `vitest`, `jest`, `pytest`, `mocha`, `cargo`, `go test`, etc.
   - Manifest test script: `package.json` `scripts.test`, `pyproject.toml` `[tool.pytest.ini_options]`, `tox.ini`.
   - `Makefile` `test:` target.
   - File-naming fallback: `*_test.go`, `*.spec.ts`, `tests/test_*.py`.
   - **Monorepo**: walk up from the file being edited to the nearest manifest. Re-detect per touched package; do not assume one runner for the whole tree.
   - If signals conflict (e.g. vitest and jest both present) or are absent, prefer whichever the CI config or manifest test script actually invokes; if it's genuinely ambiguous, pick one, proceed, and note the ambiguity in the summary rather than blocking.
2. **Slice declaration**: before touching code, state in one line what observable behavior this slice will produce.
3. **RED**: write the smallest failing test for the slice. Run it. Paste the last 10–20 lines of runner output so the failure is concretely visible — not paraphrased.
4. **GREEN**: write the minimum implementation that makes the test pass. Run the **full suite**, not only the new test. Paste the runner summary.
5. **REFACTOR**: either improve structure (keeping all tests green, then re-run the suite to confirm) OR state explicitly `refactor: none needed`. Skipping is fine; silent skip is the failure.
6. **Spike escape**: if a slice genuinely cannot be tested first (unknown API shape, exploratory data format), declare `spike: <reason>` in one line, do the spike, then rejoin at **RED** by writing a test that encodes the spec the spike clarified — not the spike implementation. Keeping / modifying / discarding the spike code is a tactical call; the test must remain spec-driven. Cross-check: would the same test be written if the spike code were gone? If no, the test is implementation-driven.

## Anti-patterns + alternatives

Each ❌ has a sanctioned ✅ alternative. If drawn to a ❌ move, take the ✅ instead.

| ❌ Pattern | ✅ Alternative |
|---|---|
| Weaken an assertion to make a test pass (`toBe(429)` → `toBeDefined()`) | Ask the user whether the original assertion encodes a real spec change. Change only after the answer. |
| Implementation-first, test-after | Declare spike mode if exploration is needed; rejoin test-first at RED once the unknown is resolved. |
| Trivial test (`assert true`, `expect(x).toBeTruthy()` on a constant) to clear a gate | Treat as a signal that the slice is too large or fuzzy — split the slice. |
| Tautological test — fixture / expected values copy-pasted from the implementation, so the only possible outcome is green | Build the test from the spec / requirement, not from the code. Cross-check: would the same test be written if the implementation were deleted? |
| Skip / disable the newly-written test (`.skip()`, `xit`, `@pytest.mark.skip`, `x-describe`) to reach GREEN | Name the blocker explicitly. If the slice is too large, split; if a dependency is genuinely unavailable, narrow the slice to what is testable now. |
| Skip refactor without acknowledging it | Write one line: `refactor: none needed`. Skipping is fine; silence is the problem. |
| Silently delete a pre-existing test labeled "flaky" | One-line root-cause note + `skip` with comment (quarantine). If the user explicitly approves deletion, proceed and note the count in the final summary. |
| Mock the SUT to reach green | Slice / boundary is wrong — test the pure logic directly and push I/O or network dependencies to the slice edge behind a thin interface or adapter. |
| Quietly edit a pre-existing test to fit the new implementation | Pre-existing tests are read-only by default. To change one, write a one-line reason in the diff and report the change count in the final summary. |
| Run only the new test in GREEN | Always run the full suite — regression catching is half the value of TDD. |
| Bleed refactor and new behavior into the same step | Split: refactor first (green stays green), then next RED for the new behavior. |

## Workflow at a glance

```
detect runner
  → declare slice
    → RED      (write test, run, paste tail)
      → GREEN  (minimal impl, run full suite, paste summary)
        → REFACTOR (improve + re-run, or `none needed`)
          → next slice
```

Spike branch (from any phase): declare `spike: <reason>` → spike → rejoin at **RED** with a spec-driven test (not one that mirrors the spike code).
