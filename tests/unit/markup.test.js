// a11y chunk 5: page markup checks over every *.html in the repo root.
// B1 skip link first and before the header, F12 decorative arrows hidden,
// B4 every new-tab link says so, F9 table regions in the sample report.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const PAGES = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html')).sort();
const parse = (f) => new DOMParser().parseFromString(fs.readFileSync(path.join(ROOT, f), 'utf-8'), 'text/html');

// Elements a keyboard user can Tab to, in document order (tabindex -1 excluded).
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), '
  + 'textarea:not([disabled]), summary, iframe, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

// Accessible name of a link: aria-label wins, else its text (hidden spans included).
const linkName = (a) => (a.getAttribute('aria-label') ?? a.textContent).replace(/\s+/g, ' ').trim();

it('finds the 14 site pages', () => {
  expect(PAGES).toHaveLength(14);
});

describe.each(PAGES)('%s', (page) => {
  const doc = parse(page);

  it('the first focusable element in <body> is the skip link to #main, before the header', () => {
    const first = doc.body.querySelector(FOCUSABLE);
    expect(first.tagName).toBe('A');
    expect(first.classList.contains('skip-link')).toBe(true);
    expect(first.getAttribute('href')).toBe('#main');
    expect(first.textContent).toBe('Skip to main content');
    expect(doc.body.firstElementChild).toBe(first);
    const header = doc.querySelector('header');
    if (header) expect(first.compareDocumentPosition(header) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('has exactly one <main id="main" tabindex="-1">', () => {
    const mains = doc.querySelectorAll('main');
    expect(mains).toHaveLength(1);
    expect(mains[0].id).toBe('main');
    expect(mains[0].getAttribute('tabindex')).toBe('-1');
  });

  it('every span.arrow is aria-hidden', () => {
    for (const span of doc.querySelectorAll('span.arrow')) expect(span.getAttribute('aria-hidden')).toBe('true');
  });

  it('every target="_blank" link says it opens in a new tab', () => {
    for (const a of doc.querySelectorAll('a[target="_blank"]')) expect(linkName(a)).toMatch(/\(opens in new tab\)$/);
  });

  // a11y chunk 6b (F13): Services is a real link, the menu has its own button.
  it('Services is a link to services.html with a separate menu button', () => {
    const link = doc.querySelector('a#servicesLink');
    expect(link.getAttribute('href')).toBe('services.html');
    expect(link.textContent).toBe('Services');
    const btn = doc.querySelector('button#servicesToggle');
    expect(btn.getAttribute('type')).toBe('button');
    expect(btn.getAttribute('aria-controls')).toBe('servicesMenu');
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    expect(btn.getAttribute('aria-label')).toBe('Services menu');
    expect(link.nextElementSibling).toBe(btn);
    expect(doc.getElementById('servicesMenu').querySelectorAll('a')).toHaveLength(5);
    expect(doc.body.textContent).not.toContain('View all services');
  });
});

it('aria-current="page" on Services only on services.html', () => {
  const current = PAGES.filter((p) => parse(p).querySelector('a#servicesLink[aria-current="page"]'));
  expect(current).toEqual(['services.html']);
});

it('counts: 12 aria-hidden arrows and 12 new-tab links across the site', () => {
  let arrows = 0;
  let newTab = 0;
  for (const page of PAGES) {
    const doc = parse(page);
    arrows += doc.querySelectorAll('span.arrow[aria-hidden="true"]').length;
    newTab += doc.querySelectorAll('a[target="_blank"]').length;
  }
  expect(arrows).toBe(12);
  // 12 since Gate 2 chunk 6: the A6 "Turnstile Privacy Addendum" link in privacy-policy.html.
  expect(newTab).toBe(12);
});

describe('sample-report.html table regions (F9)', () => {
  const doc = parse('sample-report.html');
  const bodies = [...doc.querySelectorAll('.report-section-body')];

  it('each section body holding a table is a focusable, labelled region; the CVE section is not', () => {
    const regions = bodies.filter((b) => b.querySelector('table'));
    expect(regions.map((b) => b.getAttribute('aria-label'))).toEqual([
      'DNS reconnaissance table', 'Port scan results table', 'SSL/TLS analysis tables', 'Web security headers table',
    ]);
    for (const b of regions) {
      expect(b.getAttribute('tabindex')).toBe('0');
      expect(b.getAttribute('role')).toBe('region');
    }
    const ssl = regions.find((b) => b.getAttribute('aria-label') === 'SSL/TLS analysis tables');
    expect(ssl.querySelectorAll('table')).toHaveLength(2);
    const noTable = bodies.filter((b) => !b.querySelector('table'));
    expect(noTable).toHaveLength(1);
    expect(noTable[0].closest('section, div').parentElement.textContent).toContain('CVE Lookup');
    expect(noTable[0].hasAttribute('tabindex')).toBe(false);
    expect(noTable[0].hasAttribute('role')).toBe(false);
  });
});

describe('css/styles.css rules (chunk 5)', () => {
  const css = fs.readFileSync(path.join(ROOT, 'css/styles.css'), 'utf-8');
  it('the table regions share the .compare-wrap focus ring', () => {
    expect(css).toMatch(/\.compare-wrap:focus-visible,\s*\.report-section-body:focus-visible\s*\{/);
  });
  it('.process-strip .arrow uses --text-secondary', () => {
    expect(css).toContain('.process-strip .arrow { color: var(--text-secondary); }');
  });
  it('the Services menu button is hidden below 1280px and has a 24px target, chevron and focus ring at 1280px', () => {
    expect(css).toMatch(/\n\.nav-dropdown-toggle \{\s*display: none;\s*\}/);
    const desktop = css.slice(css.indexOf('@media (min-width: 1280px)'));
    const rule = desktop.match(/\.nav-dropdown-toggle \{([^}]*)\}/)[1];
    for (const decl of ['display: inline-flex', 'width: 24px', 'height: 24px']) expect(rule).toContain(decl);
    expect(desktop).toContain('.nav-dropdown-toggle:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--accent); }');
    expect(desktop).toMatch(/\.nav-dropdown-toggle\[aria-expanded="true"\]::after \{/);
    expect(css).not.toContain('nav-dropdown-view-all');
    expect(css).toContain('.nav-links a.nav-dropdown-link.nav-dropdown-link-active {');
  });
  it('.skip-link sits above the sticky header (z-index 40) and is shown on :focus', () => {
    const rule = css.match(/\.skip-link \{([^}]*)\}/)[1];
    const z = Number(rule.match(/z-index:\s*(\d+)/)[1]);
    expect(z).toBeGreaterThan(40);
    expect(rule).toContain('background: var(--accent)');
    expect(rule).toContain('color: var(--on-accent)');
    expect(css).toMatch(/\.skip-link:focus \{[^}]*transform: none;/);
  });
});

describe('css/styles.css reduced motion (Gate 2 chunk 2, B2)', () => {
  const css = fs.readFileSync(path.join(ROOT, 'css/styles.css'), 'utf-8');
  // The whole @media block, up to its closing brace at the start of a line.
  const start = css.indexOf('@media (prefers-reduced-motion: reduce) {');
  const block = css.slice(start, css.indexOf('\n}', start));

  it('there is one reduced-motion block and it keeps the reveal and scroll rules', () => {
    expect(css.split('@media (prefers-reduced-motion: reduce)').length - 1).toBe(1);
    expect(block).toContain('.js-ready .reveal {');
    expect(block).toContain('html { scroll-behavior: auto; }');
  });
  it('turns off the hover and press motion of .btn, .cert-badge-link and the Services chevron', () => {
    expect(block).toContain('.btn, .cert-badge-link, .nav-dropdown-toggle::after { transition: none; }');
    expect(block).toContain('.btn:active, .cert-badge-link:hover { transform: none; }');
  });
});
