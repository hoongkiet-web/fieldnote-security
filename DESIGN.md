# Design

<!-- impeccable:design-record 1 -->

## Direction

Split scan-vs-review contrast structure (candidate 5 of 7 grounded homepage structures, seed key `5ec915e0`). The hero proves the product's core claim — manual review turns scanner noise into prioritized signal — by showing raw scan output beside the same finding after review, instead of stating it in prose. This structure was chosen over a "report-as-canvas" alternative (using the report's own component system as the whole page's chrome) because it dramatizes the differentiator directly rather than only borrowing its look; report-as-canvas continuity is still honored through the shared token system below.

## Visual world

Inherited from the working VulnAssess CLI scanner report at `cybersec-agency/reports/*.html` (a real, shipped artifact, not an invented palette) and extended for a marketing/Persuade surface. The site was renamed to "TrustLayer Security" on 2026-08-12; the underlying report file/branding was not renamed (see PRODUCT.md).

- **Ground:** near-black navy `#0f172a`, card surfaces `#1e293b`, hover state `#263348`, borders `#334155` / `#1e293b`.
- **Text:** `#e2e8f0` primary, `#94a3b8` secondary (the floor for any readable text on these surfaces — see Known deviations below), `#64748b` / `#475569` reserved for non-text or decorative use only.
- **Accent:** sky-blue `#38bdf8`, used for the operator's identity and the "reviewed/signal" state — never for severity.
- **Severity (functional only):** critical `#dc2626`, high `#ea580c`, medium `#d97706`, low `#2563eb`, ok `#16a34a`. Reused verbatim from the report; never used decoratively on the marketing pages.
- **Type:** IBM Plex Sans (display/headings, swapped from Space Grotesk 2026-08-12 - see entry below), Inter (body/UI), IBM Plex Mono (domains, scan-output strings, stat-grid figures, port numbers, step indices - functional CLI-adjacent data, not a "technical" costume).
- **Color strategy:** Restrained — neutrals plus one accent, matching the brief's "professional, not flashy" instruction and the inherited report.

## Components

- `.compare` — two-panel raw/reviewed card, the page's signature element. Left panel: terse mono strings, no badges. Right panel: severity badge + one-line human judgment, built from the report's own `.badge` component.
- `.steps` — three-panel numbered process (numbers carry real sequence information: submit → scan → receive, not decorative).
- `.teaser` — content + mock preview pairing, used for the sample-report and about teasers; the mock preview reuses the report's `.stat-card` border-left convention deliberately, as a direct callback.
- `.credentials-list` — dot-marker list, mono type, no icons.

## Motion

One authored moment: the "after manual review" panel's rows animate in on page load via a plain CSS `@keyframes` (staggered ~80ms, starting 300ms after the raw panel is already visible — raw-then-reviewed reinforces the narrative). This runs unconditionally, with no JavaScript dependency, so it can't race or flash. Below-the-fold sections use a JS `IntersectionObserver` reveal gated behind a `.js-ready` class that JS adds itself — default state (no JS, or JS blocked) is fully visible, never permanently hidden. `prefers-reduced-motion` strips both.

## Known deviations from an initial pass

A first draft used `--text-muted` (`#64748b`) and `--text-faint` (`#475569`) as foreground text color in five places (raw-panel findings, hero note, comparison column labels, footer meta, mock stat labels). Measured against their backgrounds these ran 1.9–3.7:1, under the 4.5:1 floor for body text. All five were moved to `--text-secondary` (`#94a3b8`, ≥5.7:1 on both surfaces). `--text-muted` / `--text-faint` remain defined as tokens for future non-text use but should not be used as text color on `--bg` or `--bg-elevated` without rechecking contrast.

## Review note

No `impeccable-finish-reviewer` / `impeccable-documenter` subagent is available in this harness's agent roster, and no browser tool was available for screenshot capture this session. This file and the fixes above were produced by an in-thread manual pass against `craft-floor.md` (contrast math, fail-safe motion states, mobile-menu logic) rather than the shipped finish review. A screenshot-based visual pass (desktop + 375px) is still owed before this ships — recommended once `/chrome` or another screenshot path is available.

## Contact page (built 2026-08-12)

Extends the same token system with a `.form-card` component (dark card, same radius/border convention as `.teaser`) and native `<input>`/`<textarea>` styling: `--bg` fields inside `--bg-elevated` cards, accent focus ring (`box-shadow` in `--accent-dim`), native `required`/`type` validation via `reportValidity()` rather than custom validation UI. Submits to Formspree (`https://formspree.io/f/nzqpgg1b`) via `fetch` so a thank-you state can render in place without navigating away; includes a Formspree honeypot (`_gotcha`) and a static `_subject` field. Added `--error-text` (`#f87171`) as a dedicated foreground-text token — `--sev-high` measured ~4.1:1 on `--bg-elevated`, just under the 4.5:1 floor, so it stays background-only (badges) and this lighter red carries error copy instead.

## Services, Sample Report, About pages (built 2026-08-12)

All three inherit the existing token system, no new palette:

- **Services** — `.phase-list`/`.phase-row`, a single-column list (not the homepage's 3-up `.steps` grid) describing the real 6-phase pipeline from `trustlayer_scan.py` (renamed from `vuln_assess.py` 2026-08-12; DNS → ports → SSL/TLS → headers/paths → CVE → manual review). Phase numbers are kept because they reflect the tool's real, literal execution order, not decoration. `.process-strip` and `.pull-statement` (accent `border-left`, echoing the report's own section-header convention) reinforce positioning briefly rather than re-explaining the homepage's "How it works" at length.
- **Sample Report** — `.report-frame`/`.report-section`/`.stat-grid` recreate the real shipped report's own component system (stat cards, section headers with accent `border-left`, tables) using real values pulled from the actual `example.com` sample run in `cybersec-agency/reports/`, not invented data. Re-labeled to the current brand in the title bar; the underlying report file itself was intentionally left unrenamed (see PRODUCT.md).
- **About** — text-first (no fabricated headshot/photo — none exists), `.credential-detail` list. Uses the user's real job title and the verified "300+ releases a year" metric, consistent with confirmed background facts.

Also caught during this pass: `.field input::placeholder` / `.field textarea::placeholder` were using `--text-muted` (~3.75:1 on the field background), under the craft-floor's placeholder-text floor. Fixed to `--text-secondary`, matching the same class of bug fixed on the homepage.

## GDPR Checker page + contact form service selector (built 2026-08-12)

Second service line, added as a pure extension — no new components, palette, or layout patterns, per explicit instruction:

- **`gdpr-checker.html`** reuses `.page-hero`, `.phase-list`/`.phase-row` (3 phases instead of services.html's 6: Technical Scan, Data Practices Questionnaire, Manual Review), `.process-strip`, `.pull-statement`, and `.final-cta` verbatim from services.html's pattern.
- Added to nav + footer on all six pages, ordered Services → Sample Report → GDPR Checker → About → Contact.
- **Contact form** gained a required `<select name="service">` (Vulnerability Assessment / GDPR Compliance Check / Both) between Website URL and Message. Styled by folding `select` into the existing `.field input, .field textarea` rule rather than a new component; the unselected placeholder option is dimmed via `.field select:invalid` to echo (not duplicate) the existing placeholder-text treatment. No change to submit/thank-you/error logic.
- PRODUCT.md updated: Product Purpose/Positioning/Operating Context now cover two service lines; the GDPR data-practices questionnaire itself is described on-page but not yet built as an on-site form (delivered by the operator after intake until/unless requested as a dedicated page).

## Email Security page + checkbox service selector (built 2026-08-12)

Third service line, same extension pattern as GDPR Checker:

- **`email-security.html`** reuses the identical services.html/gdpr-checker.html pattern: `.page-hero`, 3-row `.phase-list` (DNS Authentication Scan, Spoofing Risk Assessment, Manual Review), `.process-strip`, `.pull-statement`, `.final-cta`.
- Added to nav + footer on all seven pages, ordered Services -> Sample Report -> GDPR Checker -> Email Security -> About -> Contact.
- **Contact form service selector converted from single-select to checkboxes** (multiple `<input type="checkbox" name="service">` inside a `<fieldset class="checkbox-group-field">`), since three service options no longer fit an exhaustive "Both" pattern and a client may want more than one. New `.checkbox-group`/`.checkbox-option` CSS was added (the one new component this pass required, since none existed) but stays inside the existing token system: native checkboxes recolored via `accent-color: var(--accent)`, fieldset/legend styled to match `.field label` exactly, no new palette. "At least one service checked" isn't natively expressible via `required` on a checkbox group, so it's validated in the submit handler alongside the existing `reportValidity()` call, reusing the existing `.form-status` error-text element rather than a new error pattern.
- PRODUCT.md updated: Product Purpose/Positioning/Operating Context now cover three service lines.

## Design hook findings pass + display font swap (2026-08-12)

The design detector flagged 5 findings after the Email Security build:

- **4x side-tab accent border** (`.mock-stat`, `.report-body .stat-card`, `.report-section h2`, `.pull-statement`). Three are literal reproductions of the real shipped scanner report's own `.stat-card`/`section h2` components - left unchanged, they're inherited from a real artifact, not a reached-for default. `.pull-statement`'s border-left had no such backing (invented for the service pages) - fixed by replacing the colored side border with a neutral `border-top` + `padding-top`, an editorial pull-quote convention instead of the flagged pattern.
- **Overused-font (Space Grotesk)** - a cross-site brand decision, so it went to the user rather than being silently kept or silently changed. User chose to swap (see below). Re-running the detector after the swap surfaced the same rule against **Inter** (the body/UI font, not display) - user confirmed intentional, persisted via `/impeccable hooks ignore-value overused-font inter --shared`. Rationale: personality now lives in the IBM Plex Sans headings; a neutral, highly legible face for body/UI register is the conventional and defensible choice there, not a "stopped looking" default.

**Display font swapped Space Grotesk -> IBM Plex Sans**, site-wide via the `--font-display` token and the `@import` line - propagates automatically to h1/h2/h3, `.wordmark`, `.pull-statement p`. Also reclassified two data-figure elements that were using the display font onto `--font-mono` instead, per explicit instruction that tabular/technical data (stat-grid figures, port numbers) should read as data, not headline: `.report-body .stat-card .value` and `.teaser-visual .mock-stat b`. Added `.mono` to the sample-report port-scan table's port-number cells, which had been plain text despite every other value cell in that report (DNS, SSL, headers) already being mono. Font sizes/weights/spacing left unchanged - this was a typeface swap only.

**Overflow check requested for the mono changes**: found `.report-section-body` (wrapping every sample-report table) had no horizontal-overflow protection at all - a pre-existing gap, not new from this swap, but exactly what the check was for. Added `overflow-x: auto` so a table that can't fit 375px scrolls within its frame instead of breaking page width. The specific font-swap changes (short numbers, port digits) aren't wide enough to be the actual risk; the headers table's long "Recommendation" text is the more likely trigger, and is now protected by the same fix.

## Open for future pages

Seven pages are now built (Homepage, Services, Sample Report, GDPR Checker, Email Security, Contact, About). Any further pages or services should inherit this token system and component set rather than open a new visual-world decision.
