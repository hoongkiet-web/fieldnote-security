# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

static HTML/CSS/JS

## Users

Primary: startup founders and small dev teams (early-stage companies with a technical founder or small team) who want an outside expert's security opinion before a launch, funding round, or client-facing audit. They know enough to be dangerous but don't have in-house security headcount.

## Product Purpose

A lead-generation / credibility site for manual security/compliance consulting services. Five service lines as of 2026-08-13: (1) vulnerability assessment, (2) GDPR compliance check, (3) email security (SPF/DKIM/DMARC) check, (4) accessibility check, (5) third-party script audit. All five exist to get a prospect to trust the operator enough to submit a request via the contact form. Success = qualified contact-form submissions, not self-service signups.

## Positioning

Not an automated scanner-as-a-service, not an automated compliance-score tool, not a generic "email health score" checker, not just an automated accessibility pass/fail score, and not a generic browser-extension script blocker. For vulnerability assessment: the operator runs the scan (DNS recon, port scan, SSL/TLS analysis, header/path checks, CVE lookup) themselves and manually reviews the output. For the GDPR check: a technical scan (cookie consent, tracking scripts, privacy policy presence, HTTPS) plus a structured data-practices questionnaire, both reviewed manually together. For the email security check: an SPF/DKIM/DMARC DNS scan plus a spoofing risk assessment, reviewed manually into an exact, prioritized list of DNS records to add. For the accessibility check: an automated WCAG scan (alt text, contrast, ARIA, keyboard gaps, heading structure) plus a manual usability review (keyboard nav, focus order, link text, form errors) that automated tools miss, ranked by real user impact rather than rule-violation count. For the third-party script audit: a full script inventory scan (every third-party script, tracker, and embed loading on the site) plus a risk and access review (known vulnerabilities, excessive data access, unexplained changes), then a manual pass on what's necessary versus dead weight versus genuine risk. All five explicitly reject "generic automated score" framing. Each leans on hands-on enterprise experience (9+ years across Sky and BT) plus current MSc Cyber Security study. The differentiator across all five services is expert human review attached to every report, not tooling novelty - a neighboring "instant automated" product could not truthfully claim the same review step.

## Operating Context

Client-facing flow: prospect lands on the site -> reads homepage/services/sample report/GDPR checker/email security/accessibility checker/third-party script audit/about -> submits a request (checking one or more of Vulnerability Assessment, GDPR Compliance Check, Email Security Check, Accessibility Check, Third-Party Script Audit) via a Formspree-backed intake form -> operator manually runs the relevant work (CLI scanner `trustlayer_scan.py` in the sibling `cybersec-agency` project for vulnerability assessments; scan + questionnaire review for GDPR; DNS record scan + review for email security; automated WCAG scan + manual usability review for accessibility; script inventory scan + risk/access review for third-party scripts) -> operator reviews findings -> operator sends the finished report back to the client directly (not through the website). No account system, no self-service scan trigger, no payment flow in v1. The GDPR questionnaire, the email-security DNS scan, the accessibility scan, and the script inventory scan are each described on their own pages as part of the process but are not yet built as on-site self-service tools - delivered by the operator after intake until/unless a dedicated page is requested.

## Capabilities and Constraints

- v1 has no self-service scanning - the contact form only captures intake info (including which service(s), via checkboxes since a client may want more than one), it does not trigger any scanner or generate an automated score.
- Form submissions go through Formspree to the operator's email; no backend/database in v1.
- Pricing model is quote-based, not fixed self-checkout pricing (exact pricing structure still undecided - do not invent numbers).
- Site must be mobile-first and tested at 375px width.
- Nine pages for v1: Homepage, Services, Sample Report, GDPR Checker, Email Security, Accessibility Checker, Third-Party Script Audit, Contact/Intake, About/Credentials.
- Nav now carries 6 service-adjacent links plus About and the CTA button (8 items total); at five service lines the desktop nav-links breakpoint was measured directly (rendered nav content = 92px wordmark + 895px nav-links = 987px, needing a viewport ≥1027px to avoid overlap) and raised from 1100px to 1120px, tying it to `.container`'s existing 1120px `max-width` rather than an arbitrary round number - beyond that width `.container` stops growing so there's no benefit to a higher breakpoint. Any sixth service line should re-measure rather than assume it still fits; note that past 1120px viewport, available nav space is capped at 1080px (1120 minus 40px container padding) regardless of window size.

## Brand Commitments

- Name: "TrustLayer Security" (finalized 2026-08-12, replacing the earlier working name "VulnAssess"). The underlying scanner report in `cybersec-agency/reports/*.html` still carries the old "VulnAssess" branding/filenames - those were not renamed, only the website. Sample-report page work should either regenerate a report under the new name or clearly relabel it.
- Tone: professional and trustworthy, restrained - explicitly not flashy. This is a trust/credibility site, not a hype product.
- Visual continuity expected with the existing scanner report output (dark theme, sky-blue accent, slate cards) since the sample report page will show that report directly.

## Evidence on Hand

- Real, working sample report: `cybersec-agency/reports/vulnassess_example_com_20260810_201305.html` (anonymised/placeholder domain, example.com) - can be used directly or adapted for the sample report page.
- Real scanner capabilities to describe on the Services page: DNS reconnaissance + subdomain enumeration, port scanning with risk-rated banner grabbing, SSL/TLS certificate analysis, missing security header checks, sensitive path checks, CVE lookup via NVD.
- Real credentials: 9+ years across Sky (Sky Q, Sky Mobile, sky.com) and BT; Cisco CyberOps Associate certification; Cisco Ethical Hacker certification; MSc Cyber Security (Open University, in progress).
- No testimonials, case studies, or past client names exist yet - do not fabricate any.

## Product Principles

1. Every claim on the site must be backed by something real (the working scanner, verifiable certifications, actual employment history) - this is a credibility site, fabricated trust signals defeat its purpose.
2. The manual-review step is the product's core value and must stay visible on every page that explains the service - it is what separates this from a commodity automated scanner.
3. Restraint over spectacle: motion and visual flourish should read as "this person is careful and precise," matching an audience of technical founders evaluating a security vendor.
4. Mobile-first: a meaningful share of traffic will read this on a phone (shared links, LinkedIn, etc.) - 375px is the baseline, not an afterthought.
5. The site and the sample report must feel like one product - shared palette, shared type choices, no visual seam between "marketing site" and "the actual deliverable."

## Accessibility & Inclusion

No specific standard mandated yet. Default to solid semantic HTML, sufficient color contrast against the dark theme, and keyboard-operable form/nav as a baseline. Now that the site sells an accessibility audit service (2026-08-12), this baseline matters more than a nice-to-have - a site selling accessibility reviews that fails basic checks itself is a credibility problem, not just a UX one.
