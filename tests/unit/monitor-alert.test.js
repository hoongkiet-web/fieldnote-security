// FS-163: the business-outcome alert in contact-form.js and auth-form.js
// (two deliberate copies, one per form). Covers what Playwright cannot see:
// keepalive (not exposed by Playwright's request API) and the per-hostname
// URL choice for hosts the qa/ suite never serves from. The end-to-end
// request shape and ordering are also asserted in the scanner repo's
// qa/formspree-failure.spec.js.
//
// Same loading approach as chatbot-widget.test.js: the real shipped source
// is eval'd fresh against jsdom per test, not reimplemented. It is wrapped in
// new Function('location', 'fetch', src) so each test can choose the page
// hostname and mock fetch without touching jsdom's own window.location.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const read = (f) => fs.readFileSync(path.resolve(__dirname, '../../js', f), 'utf-8');
const FORM_GUARD_SRC = read('form-guard.js');

const PRODUCTION_URL = 'https://fieldnotesecurity.com/api/monitor';
const STAGING_URL = 'https://fieldnote-security-monitoring-staging.fieldnotesecurity.workers.dev';
const ERROR_TEXT = 'Something went wrong sending this - please try again, or email contact@fieldnotesecurity.com directly.';

const FORMS = [
  { file: 'contact-form.js', formId: 'contactForm', source: 'contact-form', buttonText: 'Send request' },
  { file: 'auth-form.js', formId: 'authForm', source: 'authorization-form', buttonText: 'Submit authorization' },
];

function renderForm({ formId, buttonText }) {
  document.body.innerHTML =
    '<div id="formCard">' +
    `<form id="${formId}" action="https://formspree.io/f/test" method="POST">` +
    '<input type="checkbox" name="service" value="Vulnerability Assessment" checked>' +
    `<button type="submit" id="submitBtn">${buttonText}</button>` +
    '<span id="formStatus" role="alert"></span>' +
    '</form></div>';
}

// Loads form-guard.js + the form script for a given hostname, submits the
// form with Formspree answering `formspreeResult` (a Response-like object, or
// an Error to reject with), and returns the monitor call plus the UI state
// captured at the moment the monitor fetch was started.
async function submitWith(cfg, { hostname, formspreeResult, monitorResult = Promise.resolve({ ok: true }) }) {
  renderForm(cfg);
  const statusEl = () => document.getElementById('formStatus');
  const btn = () => document.getElementById('submitBtn');
  let uiAtAlert = null;
  const fetchMock = vi.fn((url) => {
    if (String(url).includes('formspree.io')) {
      return formspreeResult instanceof Error ? Promise.reject(formspreeResult) : Promise.resolve(formspreeResult);
    }
    uiAtAlert = { status: statusEl().textContent, disabled: btn().disabled };
    return typeof monitorResult === 'function' ? monitorResult() : monitorResult;
  });
  // eslint-disable-next-line no-eval
  (0, eval)(FORM_GUARD_SRC);
  new Function('location', 'fetch', read(cfg.file))({ hostname }, fetchMock);

  document.getElementById(cfg.formId).dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  await vi.waitFor(() => expect(statusEl().textContent).toBe(ERROR_TEXT));

  const monitorCalls = fetchMock.mock.calls.filter(([url]) => !String(url).includes('formspree.io'));
  return { monitorCalls, uiAtAlert, statusEl, btn };
}

beforeEach(() => {
  document.body.innerHTML = '';
  delete window.__fnsGuardAgainstReentry;
});

describe.each(FORMS)('$file monitor alert (FS-163)', (cfg) => {
  it.each([
    ['fieldnotesecurity.com', PRODUCTION_URL],
    ['www.fieldnotesecurity.com', PRODUCTION_URL],
    ['staging.fieldnotesecurity.com', STAGING_URL],
    ['localhost', '/api/monitor'],
    ['127.0.0.1', '/api/monitor'],
    ['unknown.example', STAGING_URL],
  ])('host %s sends the alert to %s', async (hostname, expected) => {
    const { monitorCalls } = await submitWith(cfg, { hostname, formspreeResult: { ok: false, status: 599 } });
    expect(monitorCalls).toHaveLength(1);
    expect(monitorCalls[0][0]).toBe(expected);
  });

  it('sends POST, keepalive, text/plain and a body of exactly {source, reason}', async () => {
    const { monitorCalls } = await submitWith(cfg, { hostname: 'staging.fieldnotesecurity.com', formspreeResult: { ok: false, status: 599 } });
    const [, init] = monitorCalls[0];
    expect(init.method).toBe('POST');
    expect(init.keepalive).toBe(true);
    expect(init.headers).toEqual({ 'Content-Type': 'text/plain' });
    expect(JSON.parse(init.body)).toStrictEqual({ source: cfg.source, reason: 'formspree-status-599' });
  });

  it('uses the network error message as the reason when Formspree is unreachable', async () => {
    const { monitorCalls } = await submitWith(cfg, { hostname: 'staging.fieldnotesecurity.com', formspreeResult: new TypeError('Failed to fetch') });
    expect(JSON.parse(monitorCalls[0][1].body)).toStrictEqual({ source: cfg.source, reason: 'Failed to fetch' });
  });

  it('starts the alert fetch before the error UI is shown', async () => {
    const { uiAtAlert } = await submitWith(cfg, { hostname: 'staging.fieldnotesecurity.com', formspreeResult: { ok: false, status: 599 } });
    expect(uiAtAlert).toEqual({ status: '', disabled: true });
  });

  it.each([
    ['rejects', () => Promise.reject(new TypeError('Failed to fetch'))],
    ['throws synchronously', () => { throw new TypeError('blocked'); }],
  ])('still shows the error UI when the alert fetch %s', async (_label, monitorResult) => {
    const { statusEl, btn } = await submitWith(cfg, { hostname: 'staging.fieldnotesecurity.com', formspreeResult: { ok: false, status: 599 }, monitorResult });
    expect(statusEl().textContent).toBe(ERROR_TEXT);
    expect(btn().disabled).toBe(false);
    expect(btn().textContent).toBe(cfg.buttonText);
  });
});
