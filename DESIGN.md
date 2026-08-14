# Design

<!-- impeccable:design-record 1 -->

## Direction

Split scan-vs-review contrast structure (candidate 5 of 7 grounded homepage structures, seed key `5ec915e0`). The hero proves the product's core claim — manual review turns scanner noise into prioritized signal — by showing raw scan output beside the same finding after review, instead of stating it in prose. This structure was chosen over a "report-as-canvas" alternative (using the report's own component system as the whole page's chrome) because it dramatizes the differentiator directly rather than only borrowing its look; report-as-canvas continuity is still honored through the shared token system below.

**Superseded 2026-08-13** (see "Homepage five-service revision" below): the scan-vs-review `.compare` panel was vulnerability-assessment-specific and stopped being an honest summary of the product once four more service lines shipped. The manual-review differentiator itself is unchanged and still stated in prose (hero subhead, `.hero-note`, and the per-service pages' own pull-quotes); only the single-service dramatization of it was retired in favor of representing all five services equally.

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

## Accessibility Checker page + nav breakpoint fix (built 2026-08-12)

Fourth service line, same extension pattern as GDPR Checker and Email Security:

- **`accessibility-checker.html`** reuses the identical `.page-hero` / 3-row `.phase-list` (Automated Accessibility Scan, Manual Usability Review, Prioritized Report) / `.process-strip` / `.pull-statement` / `.final-cta` pattern.
- Added to nav + footer on all eight pages. Nav label shortened to "Accessibility" (not "Accessibility Checker") to help with nav width, ordered Services -> Sample Report -> GDPR Checker -> Email Security -> Accessibility -> About -> Contact.
- **Contact form** gained a fourth checkbox, "Accessibility Check", in the same `.checkbox-group` - no new markup pattern.
- PRODUCT.md updated: four service lines now; added a note that the site itself has more reason to hold a real accessibility bar now that it sells accessibility audits.

**Nav overflow fix, found before it shipped broken**: with a 4th service page the desktop nav-links (Services, Sample Report, GDPR Checker, Email Security, Accessibility, About, + CTA button) estimated to roughly 1016px wide against a `min-width: 860px` breakpoint that used to be safe with fewer items - close enough to overflow/wrap on real mid-size laptop windows (860-1050px). Raised the nav-links breakpoint to `1100px` and tightened `.nav-links` gap from 32px to 22px; below that width the existing hamburger menu (already built, already tested) handles it. This is a threshold/spacing value change only, not a new component - the instruction to reuse the established pattern doesn't cover shipping a pattern that's quietly started to overflow. PRODUCT.md now flags that a fifth service line should re-check this threshold rather than assume it still fits.

## Third-Party Script Audit page + measured nav breakpoint fix (built 2026-08-13)

Fifth service line, same extension pattern as the four before it:

- **`third-party-audit.html`** reuses the identical `.page-hero` / 3-row `.phase-list` (Script Inventory Scan, Risk & Access Review, Manual Review) / `.process-strip` / `.pull-statement` / `.final-cta` pattern - no new markup.
- Added to nav + footer on all nine pages. Nav label shortened to "Script Audit" (not "Third-Party Script Audit" or "Third-Party Audit") to keep the now-6-item service nav manageable, ordered Services -> Sample Report -> GDPR Checker -> Email Security -> Accessibility -> Script Audit -> About -> Contact.
- **Contact form** gained a fifth checkbox, "Third-Party Script Audit", in the same `.checkbox-group` - no new markup pattern.
- PRODUCT.md updated: five service lines now.

**Nav breakpoint recheck, done by measurement instead of estimate this time**: PRODUCT.md flagged after the Accessibility Checker build that a fifth service line should re-check the `1100px` breakpoint rather than assume it still fits. Instead of eyeballing it, forced `.nav-links` to render at its natural (unwrapped, unshrunk) width via a temporary override stylesheet and read `getBoundingClientRect()`/`scrollWidth` directly: wordmark 92px + nav-links 895px (up from ~791px at four services) = 987px of required content width, meaning the row starts to overlap below a ~1027px viewport. Raised the breakpoint from `1100px` to `1120px` - deliberately matched to `.container`'s existing `max-width: 1120px` rather than picked as a round number with headroom, since past that width the container stops growing and a higher breakpoint value would buy nothing (available nav space caps at 1080px = 1120 minus 40px container padding). Verified programmatically at the exact boundary (1119px viewport: hamburger; 1120px viewport: full nav, zero horizontal overflow) and confirmed no regression across all nine pages at 320/375/1119/1120/1440px. Gap left at 22px - no further tightening needed given the resulting ~93px margin.

## Homepage five-service revision (2026-08-13)

The homepage hero and its first content section described only the vulnerability scanner, even after four more service lines shipped (GDPR, Email Security, Accessibility, Third-Party Script Audit) - it was the one page in the site that hadn't been generalized.

- **Hero copy rewritten**: heading "One person, five ways to find out what's actually wrong," subhead naming all five problem areas (security vulnerabilities, compliance gaps, email spoofing, accessibility, third-party exposure) instead of DNS/port/SSL-scan specifics. `<title>`/meta description updated to match, since they were making the same vuln-only claim. `.hero-cta-row` and `.hero-note` ("No self-service scanning...") left unchanged - both already generalize fine across all five services and didn't need rewording.
- **`.compare` raw-vs-reviewed panel removed** - it was the page's signature element (see amended Direction note above) but was built entirely from vulnerability-scan findings (open ports, missing headers, subdomains, self-signed certs) with no honest way to generalize it to five unrelated services without inventing findings for services that don't work that way (e.g. an accessibility check doesn't produce "PORT 443 OPEN"-style raw output). Removed `.compare`/`.compare-col`/`.finding-row`/`.finding-top`/`.finding-note`/`@keyframes findingIn` and the matching `prefers-reduced-motion` override as dead CSS. `.badge`/`.badge-high`/`.badge-medium`/`.badge-low` were kept in place (shared with `sample-report.html`, confirmed via grep before removal - still 9 badge instances rendering there after the change).
- **New `.service-grid`/`.service-card` component** replaces it: a "What I check" section listing all five services, each a full-card link to its own page, copy taken verbatim from the task spec. Not a new visual pattern - modeled directly on `.steps`' existing seamless-grid technique (1px `gap` + `--border` background showing through as hairline dividers, `--bg-elevated` card fill, same border-radius scale), the same technique `.compare` itself used. New use of the `--bg-elevated-hover` token (defined since the original build, never previously used) as the card hover state, and `--accent-border`-style restraint - no shadow/lift, matching the "careful and precise, not flashy" motion principle. Breakpoints (640px/960px, 1→2→3 columns) reuse the site's existing breakpoint scale rather than introducing new values.
- **Five-into-a-grid fix, found during visual QA**: at 2 and 3 columns, 5 items leave a dangling empty cell in the last row: with `.service-grid`'s gap-as-divider technique, an empty grid track isn't blank, it renders as a filled `--border`-colored rectangle (the same background used for the 1px hairlines, just stretched to a full cell) - reads as a broken/unfinished tile, not empty space. Fixed with `.service-grid .service-card:last-child { grid-column: span 2; }` from 640px up, so the last card always fills whatever width remains (2-col: full-width third row; 3-col: two-thirds of the second row) instead of leaving a gap. Verified at 320/375/700/960/1119/1120/1440px with zero horizontal overflow across all nine pages.
- Old in-file HTML comment on `index.html` documenting the original scan-vs-review thesis was removed (it described a structure no longer shipped); this entry plus the amended Direction note above is now the canonical record instead.

## Mobile nav CTA padding fix, Domain & DNS Health Check page, nav breakpoint rework (built 2026-08-14)

**Mobile CTA padding bug, fixed and screenshot-verified**: the "Get Assessment" button inside the open mobile nav (`.nav-links.mobile-open a.btn`) was rendering with zero horizontal padding - text flush against both edges of the pill. Root cause was a CSS specificity gap, not a width problem: `.nav-links.mobile-open a { padding: 10px 0; width: 100%; }` (specificity 0-2-1) beats the base `.btn { padding: 11px 20px }` (0-1-0), and the existing `.nav-links.mobile-open a.btn { width: auto; margin-top: 8px; }` override (0-3-1, correctly winning on width) never redeclared `padding`, so the button kept the link rule's zeroed-out horizontal padding even after its width fix. Same latent bug existed in the `@media (min-width: 1280px)` block's equivalent `.nav-links.mobile-open a { padding: 0; width: auto; }` rule, guarded defensively too even though it's not reachable in normal use (hamburger is hidden at that width). Fixed by adding `padding: 11px 20px` (the base `.btn` value) to both `.nav-links.mobile-open a.btn` rules. Verified via actual screenshot before and after (not CSS reasoning alone) at 375px with the mobile menu open - confirmed visible breathing room on both sides of the button text, then re-confirmed again after the nav grew to 9 items from the DNS Check addition below.

**`domain-dns-check.html`**, sixth service line, same extension pattern as the five before it: reuses the identical `.page-hero` / 3-row `.phase-list` (DNS Health Scan, Attack Surface Snapshot, Manual Review) / `.process-strip` / `.pull-statement` / `.final-cta` pattern - no new markup. Added to nav + footer on all ten pages, nav label "DNS Check", ordered Services -> Sample Report -> GDPR Checker -> Email Security -> Accessibility -> Script Audit -> DNS Check -> About -> Contact. Contact form gained a sixth checkbox, "Domain & DNS Health Check". PRODUCT.md updated: six service lines now.

**Nav breakpoint: the `.container`-matching trick from the last two passes stopped working, needed a structural fix, not just a bigger number.** With a 7th nav item (9 total: 7 service links + About + CTA), true unconstrained content came to 1206px (168px wordmark + 997px nav-links + 40px padding) - which exceeds 1080px, the *ceiling* `.container`'s `max-width: 1120px` imposes on the header row at any viewport width. Raising the breakpoint number alone (as done for the 4th and 5th service lines) could no longer help, since past 1120px the container simply stops growing. Fixed with two changes together: `.nav-links` gap tightened `22px` -> `18px` (true need down to 1174px), and `.nav-row` given its own `max-width: 1280px` - a header-only override of `.container`'s 1120px, winning via source order (same specificity, `.nav-row`'s rule appears later in the file) and scoped to the header alone so no other page section's content width changes. Breakpoint raised to match at `1280px`, giving 1240px available vs 1174px needed (~66px margin).

**Two measurement-methodology traps hit and fixed along the way**, worth recording since they'll recur:
1. **Flex-shrink silently under-reports true content width once the row is already overflowing at measurement time.** The previous two passes' "force `.nav-links` to `width: max-content`, read `getBoundingClientRect()`" technique only protects `.nav-links` itself; it doesn't protect `.wordmark`, the other flex child in `.nav-row`. Once total content exceeded the 1080px cap (which it did for the first time this pass), the browser's default `flex-shrink: 1` silently compressed `.wordmark` to fit - so a naive read reported wordmark as 92px when its true unconstrained width is 168px. Caught by comparing readings before/after adding `flex-shrink: 0` to both `.nav-row` children, which changed the result. Fixed technique going forward: always force `flex-shrink: 0` on *every* direct child of the flex container being measured, not just the one you think is the bottleneck.
2. **Iframe-based CSS QA needs the stylesheet cache-busted separately from the HTML page.** Re-navigating a test iframe's `src` with a fresh `?t=timestamp` query does not guarantee `<link rel="stylesheet" href="css/styles.css">` refetches - the browser can keep serving the stylesheet response cached from an earlier iframe load in the same tab, silently testing stale CSS after an edit. Symptom looked exactly like the edit hadn't taken effect (`.nav-row` still measuring 1120px wide after setting `max-width: 1280px`). Fixed by also cache-busting the `<link>`'s `href` on load (`link.href = 'css/styles.css?bust=' + Date.now()`, awaiting its own `load` event) in every subsequent test iframe.

## Homepage service-grid catch-up + standing rule (2026-08-14)

The Domain & DNS Health Check page shipped in the previous pass without a matching card in the homepage's `.service-grid` "What I check" section - the nav, footer, and contact-form checkbox were all updated, but the homepage summary wasn't, so the site briefly described itself as offering five services on the one page most likely to be a prospect's first impression. Caught immediately after and fixed same-day:

- Added the sixth `.service-card` (`domain-dns-check.html`, "Domain & DNS Health Check", "MX, A, NS, and TXT records, plus what's reachable from the outside") - no new markup, same pattern as the other five.
- Updated the section-head subhead from "Five services..." to "Six services...".
- **Removed the `.service-grid .service-card:last-child { grid-column: span 2; }` rule added for the five-card case.** That rule existed to stop 5 items leaving a dangling empty cell in 2- and 3-column grids (see the five-service revision entry above). 6 divides evenly into both 2 and 3 columns, so the rule is no longer needed - and leaving it in would have actively broken the layout by making the 6th card span 2 columns it doesn't need, pushing itself into a new row and leaving the *actual* empty-cell bug it was written to prevent. Verified both breakpoints render as clean full rows (3 rows of 2, or 2 rows of 3) with no spanning and no gaps.
- Hero `<h1>` and subhead flagged rather than rewritten unilaterally (a headline-level copy change, not a mechanical grid update); user confirmed, so updated in the same pass. `<h1>` "five ways" -> "six ways"; subhead's five-item list gained "domain misconfiguration" as a sixth item, positioned last to match the Domain & DNS Health Check page's own framing. `<title>` and meta description carried the identical "five ways"/five-item pattern and were updated to match for the same reason the section-head text was - left stale, they'd have made the same false claim search engines and browser tabs surface first. Verified at 375px, ~627px, and 1400px: heading wraps cleanly (3 lines / 2 lines / 2 lines respectively), subhead reads without awkward breaks, zero horizontal overflow at any width.
- PRODUCT.md gained a standing rule (see Capabilities and Constraints): adding a service page isn't "done" until its `.service-grid` card ships in the same commit, not as a follow-up.

## Open for future pages

Ten pages are now built (Homepage, Services, Sample Report, GDPR Checker, Email Security, Accessibility Checker, Third-Party Script Audit, Domain & DNS Health Check, Contact, About). Any further pages or services should inherit this token system and component set rather than open a new visual-world decision - and should re-measure the nav breakpoint before adding an 8th nav item, using the flex-shrink-disabled, cache-busted technique above rather than estimating. Note that `.nav-row` now has its own `max-width: 1280px`, decoupled from the shared `.container`'s `1120px` - a future re-measure may need to raise `.nav-row`'s cap itself (not just the breakpoint number) if content again exceeds what 1280px provides.
