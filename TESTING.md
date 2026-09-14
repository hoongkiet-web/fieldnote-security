# Testing Standard

This documents the testing standard established by **FS-74** (Jira), a standing-process
ticket, not a one-off task — it applies to all future Fieldnote Security development,
website and scanner repo alike. This file exists in the website repo specifically because
this repo currently has **no test infrastructure of its own** (see "Current status in this
repo" below) — the reference implementation the standard is built from lives in the
scanner repo.

## The standard

1. **Tests are written alongside the feature, not after.** Building a feature means
   writing its tests in the same pass — not as a follow-up task, not "I'll add tests
   later."
2. **60% coverage threshold, enforced automatically, on every commit.** This is a floor
   for catching failures before customers do, not a target to hit eventually. A commit
   that drops the suite below 60% is blocked, not just flagged.
3. **Unit and integration tests are kept structurally separate**, not just distinguished
   by comment or naming convention within one folder:
   - `tests/unit/` — individual functions, run in seconds.
   - `tests/integration/` — full request/response paths, run on merges.
4. **"Already tested" must be verifiable, not just stated.** A real, tracked test file
   that can be re-run is what "tested" means — a one-off manual check that was never
   saved doesn't count, however careful it was at the time. (This standard exists partly
   because exactly that happened once on this project — see FS-73/FS-70's history.)
5. **Any automated gate (coverage threshold, pre-commit hook, etc.) must be proven to
   actually work, not just configured.** Prove it by deliberately breaking the condition
   it's meant to catch — an unreachable coverage threshold, or a failing test — confirming
   the gate actually blocks, then reverting. A gate that looks correctly configured is not
   the same claim as a gate that's been shown to fire.

## Reference implementation (scanner repo)

**FS-73** is the first real application of this standard, and is what "correct" looks
like in practice — new work should match its shape, not reinvent it:

- **`vitest`** in each of `chatbot-worker/`, `headers-worker/`, `monitoring-worker/`,
  each with its own `vitest.config.js`:
  ```js
  import { defineConfig } from 'vitest/config';

  export default defineConfig({
    test: {
      environment: 'node',
      include: ['tests/unit/**/*.test.js', 'tests/integration/**/*.test.js'],
      coverage: {
        provider: 'v8',
        include: ['src/**/*.js'],
        reporter: ['text', 'text-summary'],
        thresholds: { lines: 60, statements: 60, functions: 60, branches: 60 },
      },
    },
  });
  ```
  (`monitoring-worker`'s config additionally aliases `cloudflare:email` to a local mock,
  since that module only exists inside the real Workers runtime — see its
  `tests/mocks/` folder. Worth knowing about, not a deviation from the standard itself.)
- **`tests/unit/` + `tests/integration/`** as real, separate folders in each worker
  (not a naming convention inside one flat folder).
- **A single tracked `.githooks/pre-commit`** at the scanner repo root (not
  `.git/hooks/`, which git never syncs — enabled once per clone via
  `git config core.hooksPath .githooks`) that runs all three workers' `vitest run
  --coverage` plus the Python scanner suite's `pytest --cov-fail-under=60`, and blocks
  the commit if any of them fail or fall under 60%.
- **The Python scanner suite** gates on the coverage of its **full** suite (network +
  slow-marked tests included), not the faster `-m "not network"` subset alone — that
  faster subset reaches only ~36% on its own and would be a false floor if used as the
  actual gate. This does mean a commit takes longer and needs live network access; that
  trade-off is deliberate (see `session-reports/2026-08-27-testing-standard-setup.md`
  for the full reasoning).
- **The gate's own proof**: deliberately broken (coverage threshold set unreachable, or
  a test made to fail) and confirmed to actually block the commit, then reverted and
  confirmed clean again. Re-verified fresh as part of applying this standard formally
  (2026-09-14) — see `session-reports/2026-09-14-fs74-testing-standard.md` for that
  run's own break-then-revert evidence, independent of FS-73's original one.

## Current status in this repo (website)

**Deliberate decision, not an oversight:** this repo does not have its own
`tests/unit/`, `tests/integration/`, or coverage-gated pre-commit hook as of 2026-09-14,
and isn't getting one right now. The website's own risk surface is thin on
logic — mostly static HTML/CSS plus a handful of small JS behaviors (form validation,
the services dropdown, the chatbot widget, the mobile menu) — and it's already covered
end-to-end by the scanner repo's `qa/` Playwright suite (14 spec files: cross-browser
checks, accessibility, focus/contrast regressions, the services dropdown, chatbot panel
behavior, and more — real browser automation, not mocked). Adding a parallel `vitest`
unit-test layer here would mostly duplicate what that suite already exercises through a
real browser, for a marginal safety gain that doesn't clearly justify a second test
stack and its ongoing maintenance.

This decision can be revisited — if this repo's JS grows real, non-trivial logic that
Playwright's browser-level tests don't reach well (e.g. a pure data-transformation
function, not a DOM interaction), that's the point to reconsider, not before.
