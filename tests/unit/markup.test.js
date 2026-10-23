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
});

it('counts: 12 aria-hidden arrows and 11 new-tab links across the site', () => {
  let arrows = 0;
  let newTab = 0;
  for (const page of PAGES) {
    const doc = parse(page);
    arrows += doc.querySelectorAll('span.arrow[aria-hidden="true"]').length;
    newTab += doc.querySelectorAll('a[target="_blank"]').length;
  }
  expect(arrows).toBe(12);
  expect(newTab).toBe(11);
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
  it('.skip-link sits above the sticky header (z-index 40) and is shown on :focus', () => {
    const rule = css.match(/\.skip-link \{([^}]*)\}/)[1];
    const z = Number(rule.match(/z-index:\s*(\d+)/)[1]);
    expect(z).toBeGreaterThan(40);
    expect(rule).toContain('background: var(--accent)');
    expect(rule).toContain('color: var(--on-accent)');
    expect(css).toMatch(/\.skip-link:focus \{[^}]*transform: none;/);
  });
});
