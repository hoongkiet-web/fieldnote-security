// a11y chunk 1 (F1): js/main.js reveal-on-scroll. .js-ready .reveal starts
// hidden, so the observer must reveal at any visibility (threshold 0) and the
// hiding must be skipped entirely under prefers-reduced-motion.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MAIN_SRC = fs.readFileSync(path.resolve(__dirname, '../../js/main.js'), 'utf-8');

let observers;
class MockIntersectionObserver {
  constructor(callback, options) {
    this.callback = callback;
    this.options = options;
    this.targets = [];
    observers.push(this);
  }
  observe(el) { this.targets.push(el); }
  unobserve(el) { this.targets = this.targets.filter((t) => t !== el); }
  disconnect() { this.targets = []; }
  // Test helper: report every observed element as intersecting.
  fireAll() {
    this.callback(this.targets.map((target) => ({ target, isIntersecting: true })), this);
  }
}

function mockMatchMedia(reducedMotion) {
  window.matchMedia = vi.fn((query) => ({
    matches: query === '(prefers-reduced-motion: reduce)' ? reducedMotion : false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

function loadMain() {
  // eslint-disable-next-line no-eval
  (0, eval)(MAIN_SRC);
}

beforeEach(() => {
  observers = [];
  document.documentElement.className = '';
  document.body.innerHTML = '<main><section class="reveal" id="a"></section><div class="reveal" id="b"></div></main><footer></footer>';
  window.IntersectionObserver = MockIntersectionObserver;
});

afterEach(() => {
  delete window.IntersectionObserver;
  delete window.matchMedia;
});

describe('main.js reveal-on-scroll (WCAG 1.4.10)', () => {
  it('creates the observer with threshold 0 and no negative root margin', () => {
    mockMatchMedia(false);
    loadMain();
    expect(observers).toHaveLength(1);
    expect(observers[0].options.threshold).toBe(0);
    expect(observers[0].options.rootMargin).toBe('0px');
    expect(observers[0].targets.map((el) => el.id)).toEqual(['a', 'b']);
  });

  it('does not add js-ready (content stays visible) when reduced motion is requested', () => {
    mockMatchMedia(true);
    loadMain();
    expect(document.documentElement.classList.contains('js-ready')).toBe(false);
    expect(observers).toHaveLength(0);
  });

  it('adds js-ready and marks elements is-visible once they intersect', () => {
    mockMatchMedia(false);
    loadMain();
    expect(document.documentElement.classList.contains('js-ready')).toBe(true);
    expect(document.querySelectorAll('.reveal.is-visible')).toHaveLength(0);
    observers[0].fireAll();
    expect(document.querySelectorAll('.reveal.is-visible')).toHaveLength(2);
    expect(observers[0].targets).toHaveLength(0);
  });

  it('keeps the existing early return when IntersectionObserver is missing (no js-ready)', () => {
    mockMatchMedia(false);
    delete window.IntersectionObserver;
    loadMain();
    expect(document.documentElement.classList.contains('js-ready')).toBe(false);
  });
});

// a11y chunk 5 (B2): Escape closes the open mobile menu and focus returns to #menuBtn.
describe('main.js mobile menu Escape', () => {
  beforeEach(() => {
    mockMatchMedia(false);
    delete window.__fnsChatPanel;
    delete window.__fnsMobileMenu;
    document.body.innerHTML =
      '<header><button id="menuBtn" aria-expanded="false">Menu</button>' +
      '<nav><ul class="nav-links"><li><a href="/services.html">Services</a></li></ul></nav></header>' +
      '<main id="main" tabindex="-1"></main><footer></footer>';
    loadMain();
  });

  it('Escape closes the open menu, sets aria-expanded false and focuses #menuBtn', () => {
    const btn = document.getElementById('menuBtn');
    const links = document.querySelector('.nav-links');
    btn.click();
    expect(links.classList.contains('mobile-open')).toBe(true);
    expect(document.activeElement).toBe(links.querySelector('a'));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(links.classList.contains('mobile-open')).toBe(false);
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(btn);
  });

  it('Escape with the menu closed does nothing (focus stays where it was)', () => {
    const mainEl = document.getElementById('main');
    mainEl.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.activeElement).toBe(mainEl);
  });
});

// a11y chunk 6b (F13): "Services" is a plain link; #servicesToggle opens the menu at >= 1280px.
describe('main.js Services link and menu button', () => {
  function setup(desktop) {
    window.matchMedia = vi.fn((query) => ({
      matches: query === '(min-width: 1280px)' ? desktop : false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    delete window.__fnsChatPanel;
    delete window.__fnsMobileMenu;
    document.body.innerHTML =
      '<header><button id="menuBtn" aria-expanded="false">Menu</button>' +
      '<nav class="nav-links"><div class="nav-dropdown">' +
      '<a href="services.html" class="nav-dropdown-link" id="servicesLink">Services</a>' +
      '<button type="button" class="nav-dropdown-toggle" id="servicesToggle" aria-expanded="false" aria-controls="servicesMenu" aria-label="Services menu"></button>' +
      '<div class="nav-dropdown-menu" id="servicesMenu"><a href="gdpr-checker.html">GDPR Checker</a>' +
      '<a href="email-security.html" aria-current="page">Email Security</a></div></div></nav></header>' +
      '<main id="main" tabindex="-1"></main><footer></footer>';
    loadMain();
    return {
      link: document.getElementById('servicesLink'),
      btn: document.getElementById('servicesToggle'),
      menu: document.getElementById('servicesMenu'),
    };
  }
  // jsdom does not navigate, so dispatch a cancelable click and read defaultPrevented.
  const clickPrevented = (el) => !el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

  it('desktop: the button toggles aria-expanded and the open class, and focuses the first item', () => {
    const { btn, menu } = setup(true);
    btn.click();
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    expect(menu.classList.contains('open')).toBe(true);
    expect(document.activeElement.textContent).toBe('GDPR Checker');
    btn.click();
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    expect(menu.classList.contains('open')).toBe(false);
  });

  it('desktop: Escape closes the menu and returns focus to the button', () => {
    const { btn, menu } = setup(true);
    btn.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(menu.classList.contains('open')).toBe(false);
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(btn);
  });

  it('desktop: a click on the Services link is not default-prevented and does not open the menu', () => {
    const { link, menu } = setup(true);
    expect(clickPrevented(link)).toBe(false);
    expect(menu.classList.contains('open')).toBe(false);
  });

  it('desktop: a click outside closes the open menu', () => {
    const { btn, menu } = setup(true);
    btn.click();
    document.getElementById('main').click();
    expect(menu.classList.contains('open')).toBe(false);
  });

  it('mobile: the link is not prevented, the menu does not open, and openMenu() focuses the Services link', () => {
    const { link, btn, menu } = setup(false);
    expect(clickPrevented(link)).toBe(false);
    btn.click();
    expect(menu.classList.contains('open')).toBe(false);
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    document.getElementById('menuBtn').click();
    expect(document.activeElement).toBe(link);
  });

  it('the link, not the button, gets the active class when the current page is in the menu; no ARIA added to the link', () => {
    const { link, btn } = setup(true);
    expect(link.classList.contains('nav-dropdown-link-active')).toBe(true);
    expect(btn.classList.contains('nav-dropdown-link-active')).toBe(false);
    for (const attr of ['aria-haspopup', 'aria-controls', 'aria-expanded']) expect(link.hasAttribute(attr)).toBe(false);
  });
});
