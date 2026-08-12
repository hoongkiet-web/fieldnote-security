# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

static HTML/CSS/JS

## Users

Primary: startup founders and small dev teams (early-stage companies with a technical founder or small team) who want an outside expert's security opinion before a launch, funding round, or client-facing audit. They know enough to be dangerous but don't have in-house security headcount.

## Product Purpose

A lead-generation / credibility site for a manual vulnerability assessment consulting service. It exists to get a prospect to trust the operator enough to submit their domain via a contact form. Success = qualified contact-form submissions, not self-service signups.

## Positioning

Not an automated scanner-as-a-service. The operator runs the scan (DNS recon, port scan, SSL/TLS analysis, header/path checks, CVE lookup) themselves and manually reviews the output through the lens of hands-on enterprise experience (9+ years across Sky and BT) plus current MSc Cyber Security study, before handing back a report. The differentiator is expert human review attached to every report, not tooling novelty - a neighboring "instant automated scan" product could not truthfully claim the same review step.

## Operating Context

Client-facing flow: prospect lands on the site -> reads homepage/services/sample report/about -> submits domain + contact details via a Formspree-backed intake form -> operator manually runs the existing CLI scanner (`vuln_assess.py` in the sibling `cybersec-agency` project) -> operator reviews findings -> operator sends the finished HTML/PDF report back to the client directly (not through the website). No account system, no self-service scan trigger, no payment flow in v1.

## Capabilities and Constraints

- v1 has no self-service scanning - the contact form only captures intake info, it does not trigger the scanner.
- Form submissions go through Formspree to the operator's email; no backend/database in v1.
- Pricing model is quote-based, not fixed self-checkout pricing (exact pricing structure still undecided - do not invent numbers).
- Site must be mobile-first and tested at 375px width.
- Five pages for v1: Homepage, Services, Sample Report, Contact/Intake, About/Credentials.

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

No specific standard mandated yet. Default to solid semantic HTML, sufficient color contrast against the dark theme, and keyboard-operable form/nav as a baseline.
