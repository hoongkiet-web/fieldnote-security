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
