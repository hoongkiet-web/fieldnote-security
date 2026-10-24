// a11y chunk 4: contact and authorization forms. Success is announced and
// focused (F5), a missing service moves focus into the described fieldset
// (F8), autocomplete on the two named fields (F11).
// The real page markup (#formCard from contact.html / authorization-form.html)
// and the real scripts are loaded into jsdom; form-guard.js first, as on the
// pages. Every network call goes to a mock: the Formspree POST and the FS-163
// /api/monitor POST are answered, anything else fails the test. Nothing is
// ever sent to Formspree or to a monitor endpoint.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = (f) => path.resolve(__dirname, '../..', f);
const read = (f) => fs.readFileSync(root(f), 'utf-8');
const FORM_GUARD_SRC = read('js/form-guard.js');

const FORMS = [
  { page: 'contact.html', script: 'js/contact-form.js', formId: 'contactForm', servicesLegend: 'Which service(s) are you interested in?',
    noServiceText: 'Please select at least one service.', autocomplete: ['website', 'url'] },
  { page: 'authorization-form.html', script: 'js/auth-form.js', formId: 'authForm', servicesLegend: 'Services authorized',
    noServiceText: 'Please select at least one authorized service.', autocomplete: ['repTitle', 'organization-title'] },
];

// The page's own #formCard markup, as shipped.
function formCardHtml(page) {
  const doc = new DOMParser().parseFromString(read(page), 'text/html');
  const card = doc.getElementById('formCard');
  if (!card) throw new Error(`no #formCard in ${page}`);
  return card.outerHTML;
}

// Fill every required control with a valid value so reportValidity() passes.
function fillRequired(form) {
  form.querySelectorAll('[required]').forEach((el) => {
    if (el.type === 'checkbox') el.checked = true;
    else if (el.tagName === 'SELECT') el.value = [...el.options].find((o) => o.value).value;
    else if (el.type === 'email') el.value = 'qa@example.com';
    else if (el.type === 'url') el.value = 'https://example.com';
    else if (el.type === 'date') el.value = '2026-10-23';
    else if (el.type === 'tel') el.value = '02000000000';
    else el.value = 'Test value';
  });
}

let networkCalls;
function makeFetch(formspreeResponse = { ok: true, status: 200 }) {
  return vi.fn((url) => {
    const u = String(url);
    networkCalls.push(u);
    if (u.startsWith('https://formspree.io/')) return Promise.resolve(formspreeResponse);
    if (u === '/api/monitor') return Promise.resolve({ ok: true });
    throw new Error(`un-mocked fetch to ${u}`);
  });
}

function load(cfg, fetchMock) {
  document.body.innerHTML = '<main>' + formCardHtml(cfg.page) + '</main>';
  // eslint-disable-next-line no-eval
  (0, eval)(FORM_GUARD_SRC);
  // Same approach as monitor-alert.test.js: a staging hostname and the mock
  // fetch are passed in, so the script never sees jsdom's or Node's own fetch.
  new Function('location', 'fetch', read(cfg.script))({ hostname: 'staging.fieldnotesecurity.com', search: '' }, fetchMock);
  return document.getElementById(cfg.formId);
}

const submit = (form) => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
const servicesFieldset = (form) => [...form.querySelectorAll('fieldset')]
  .find((f) => f.querySelector('legend').textContent.trim().startsWith('Which service') || f.querySelector('legend').textContent.trim() === 'Services authorized');

beforeEach(() => {
  networkCalls = [];
  delete window.__fnsGuardAgainstReentry;
  // Trap: the scripts must only use the injected mock, never a global fetch.
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('global fetch must not be called'); }));
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe.each(FORMS)('$page form (a11y chunk 4)', (cfg) => {
  it('success (mocked 200): .form-success has role status and tabindex -1, and receives focus', async () => {
    const fetchMock = makeFetch();
    const form = load(cfg, fetchMock);
    fillRequired(form);
    form.querySelector('input[name="service"]').checked = true;
    submit(form);
    await vi.waitFor(() => expect(document.querySelector('.form-success')).not.toBeNull());
    const success = document.querySelector('.form-success');
    expect(success.getAttribute('role')).toBe('status');
    expect(success.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).toBe(success);
    expect(networkCalls).toHaveLength(1);
    expect(networkCalls[0]).toMatch(/^https:\/\/formspree\.io\/f\//);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('no service ticked: status text set, focus on the first service checkbox, no fetch at all', () => {
    const fetchMock = makeFetch();
    const form = load(cfg, fetchMock);
    fillRequired(form);
    form.querySelectorAll('input[name="service"]').forEach((cb) => { cb.checked = false; });
    submit(form);
    expect(document.getElementById('formStatus').textContent).toBe(cfg.noServiceText);
    expect(document.activeElement).toBe(form.querySelector('input[name="service"]'));
    expect(document.activeElement.closest('fieldset')).toBe(servicesFieldset(form));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(networkCalls).toEqual([]);
  });

  it('a failed Formspree call reports to the mocked /api/monitor only, and no success block appears', async () => {
    const fetchMock = makeFetch({ ok: false, status: 500 });
    const form = load(cfg, fetchMock);
    fillRequired(form);
    form.querySelector('input[name="service"]').checked = true;
    submit(form);
    await vi.waitFor(() => expect(networkCalls).toHaveLength(2));
    expect(networkCalls[1]).toBe('/api/monitor');
    expect(document.querySelector('.form-success')).toBeNull();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('markup: only the services fieldset is described by #formStatus; autocomplete is set', () => {
    const form = load(cfg, makeFetch());
    const fieldsets = [...form.querySelectorAll('fieldset')];
    const described = fieldsets.filter((f) => f.getAttribute('aria-describedby') === 'formStatus');
    expect(described).toHaveLength(1);
    expect(described[0].querySelector('legend').textContent.trim()).toBe(cfg.servicesLegend);
    expect(document.getElementById('formStatus')).not.toBeNull();
    const [id, value] = cfg.autocomplete;
    expect(document.getElementById(id).getAttribute('autocomplete')).toBe(value);
  });
});
