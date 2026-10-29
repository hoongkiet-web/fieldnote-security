// Gate 2 chunk 6: Cloudflare Turnstile in the chat widget (Gate 1 report A3,
// decisions 2-6). Same loading approach as chatbot-widget.test.js: the real
// shipped source runs against jsdom with a stand-in `location`. window.turnstile
// is a fake and the api.js script is never fetched (jsdom does not load it; its
// load/error handlers are fired by hand). Every token below is a fake.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FORM_GUARD_SRC = fs.readFileSync(path.resolve(__dirname, '../../js/form-guard.js'), 'utf-8');
const WIDGET_SRC = fs.readFileSync(path.resolve(__dirname, '../../js/chatbot-widget.js'), 'utf-8');

const STAGING_SITEKEY = '0x4AAAAAAFqNdyqDJz-7b8Gj';
const PRODUCTION_SITEKEY = '0x4AAAAAAFq2NF692tBmjkXV';
const API_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const NOT_AVAILABLE = 'Chat is not available right now. Please use the contact form.';
const LOAD_FAILED = 'Verification could not load. Please try again later or use the contact form.';
const VERIFYING = 'Verifying you are human, please wait.';
const VERIFY_403 = 'Please complete the verification and try again.';

function makeFakeTurnstile({ autoToken = true } = {}) {
  let n = 0;
  const t = {
    autoToken,
    opts: null,
    el: null,
    render: vi.fn((el, opts) => { t.el = el; t.opts = opts; if (t.autoToken) opts.callback(`fake-token-${++n}`); return 'fake-widget'; }),
    reset: vi.fn(() => { if (t.autoToken && t.opts) t.opts.callback(`fake-token-${++n}`); }),
    remove: vi.fn(),
    give: (token) => t.opts.callback(token),
  };
  return t;
}

function loadWidget(hostname = 'staging.fieldnotesecurity.com', turnstileOpts) {
  // eslint-disable-next-line no-eval
  (0, eval)(FORM_GUARD_SRC);
  window.turnstile = makeFakeTurnstile(turnstileOpts);
  new Function('location', WIDGET_SRC)({ hostname });
  return window.turnstile;
}

const $ = (sel) => document.querySelector(sel);
const scripts = () => Array.from(document.querySelectorAll('script')).filter((s) => s.src.includes('challenges.cloudflare.com'));
const openChat = () => $('.fns-chat-btn').click();
const closeChat = () => $('.fns-chat-close').click();
const fireLoad = () => scripts()[0].onload();
const status = () => $('#fnsChatStatus').textContent;
const notice = () => $('#fnsChatNotice');
const userMessages = () => document.querySelectorAll('.fns-msg-user').length;

function send(text = 'Hello there') {
  $('#fnsChatInput').value = text;
  $('#fnsChatSend').click();
}

function okFetch(data = { reply: 'ok' }) {
  global.fetch = vi.fn().mockResolvedValue({ json: () => Promise.resolve(data) });
  return global.fetch;
}

const sentBody = (call = 0) => JSON.parse(global.fetch.mock.calls[call][1].body);

beforeEach(() => {
  document.body.innerHTML = '<main></main><footer></footer>';
  document.head.innerHTML = '';
  delete window.__fnsGuardAgainstReentry;
  delete window.__fnsChatPanel;
  delete window.__fnsMobileMenu;
  delete window.turnstile;
  delete window.matchMedia;
  document.documentElement.removeAttribute('data-theme');
  try { sessionStorage.clear(); } catch (e) { /* not available - fine */ }
  okFetch();
});

describe('api.js loading', () => {
  it('is not requested on page load', () => {
    loadWidget();
    expect(scripts()).toHaveLength(0);
  });

  it('is requested once on the first open: one async script with the exact src and an onerror handler', () => {
    loadWidget();
    openChat();
    expect(scripts()).toHaveLength(1);
    expect(scripts()[0].src).toBe(API_SRC);
    expect(scripts()[0].async).toBe(true);
    expect(typeof scripts()[0].onerror).toBe('function');
  });

  it('is never requested twice (open, close, open)', () => {
    const t = loadWidget();
    openChat();
    fireLoad();
    closeChat();
    openChat();
    expect(scripts()).toHaveLength(1);
    expect(t.render).toHaveBeenCalledTimes(1);
  });
});

describe('render', () => {
  it('on the staging host: staging sitekey, action chat, the site theme, flexible, interaction-only, all four callbacks', () => {
    const t = loadWidget();
    openChat();
    expect(t.render).not.toHaveBeenCalled(); // waits for the script
    fireLoad();
    expect(t.render).toHaveBeenCalledTimes(1);
    const [el, opts] = t.render.mock.calls[0];
    expect(el).toBe($('#fnsChatVerify'));
    expect(opts).toMatchObject({
      sitekey: STAGING_SITEKEY, action: 'chat', theme: 'dark', size: 'flexible', appearance: 'interaction-only', retry: 'never',
    });
    for (const cb of ['callback', 'expired-callback', 'error-callback', 'timeout-callback']) expect(typeof opts[cb]).toBe('function');
  });

  it('the container is inside the panel, above the message box, named "Verification", and focus stays on the textarea', () => {
    loadWidget();
    openChat();
    fireLoad();
    const box = $('#fnsChatVerify');
    expect($('#fnsChatPanel').contains(box)).toBe(true);
    expect(box.getAttribute('aria-label')).toBe('Verification');
    expect(box.getAttribute('role')).toBe('group');
    expect(box.compareDocumentPosition($('#fnsChatInput')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(box.compareDocumentPosition($('#fnsChatBody')) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
    expect(document.activeElement).toBe($('#fnsChatInput'));
  });

  it('on the production host: production sitekey, action chat', () => {
    const t = loadWidget('fieldnotesecurity.com');
    openChat();
    fireLoad();
    expect(t.render).toHaveBeenCalledTimes(1);
    expect(t.render.mock.calls[0][1]).toMatchObject({ sitekey: PRODUCTION_SITEKEY, action: 'chat' });
    expect(notice().hidden).toBe(true);
  });

  it.each(['www.fieldnotesecurity.com', 'localhost', 'unknown.example'])(
    'host %s (no sitekey): no script, no render, the not-available notice with the contact link, Send unusable, never sends',
    async (hostname) => {
      const t = loadWidget(hostname);
      openChat();
      expect(scripts()).toHaveLength(0);
      expect(t.render).not.toHaveBeenCalled();
      expect(notice().hidden).toBe(false);
      expect(notice().textContent).toContain(NOT_AVAILABLE);
      expect(notice().querySelector('a').getAttribute('href')).toBe('contact.html');
      expect($('#fnsChatSend').getAttribute('aria-disabled')).toBe('true');
      await vi.waitFor(() => expect(status()).toBe(NOT_AVAILABLE));
      send();
      expect(global.fetch).not.toHaveBeenCalled();
      expect(userMessages()).toBe(0);
    },
  );

  it('the sitekey map: staging and fieldnotesecurity.com only, no release blocker left', () => {
    expect(WIDGET_SRC).toContain(`var PRODUCTION_SITEKEY = '${PRODUCTION_SITEKEY}';`);
    expect(WIDGET_SRC).not.toMatch(/'www\.fieldnotesecurity\.com':/);
    expect(WIDGET_SRC).not.toContain('RELEASE BLOCKER');
  });
});

describe('one token per message', () => {
  it('no token yet: no request, the message stays, "Verifying" is announced; once a token arrives the next Send goes', async () => {
    const t = loadWidget(undefined, { autoToken: false });
    openChat();
    fireLoad();
    send('Hello there');
    expect(global.fetch).not.toHaveBeenCalled();
    expect(userMessages()).toBe(0);
    expect($('#fnsChatInput').value).toBe('Hello there');
    expect(document.activeElement).toBe($('#fnsChatInput'));
    await vi.waitFor(() => expect(status()).toBe(VERIFYING));
    t.give('fake-token-late');
    expect(global.fetch).not.toHaveBeenCalled(); // never sent automatically
    $('#fnsChatSend').click();
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(sentBody().turnstileToken).toBe('fake-token-late');
  });

  it('with a token: the body has message, history and turnstileToken at the top level', async () => {
    loadWidget();
    openChat();
    fireLoad();
    send('First question');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(sentBody()).toEqual({ message: 'First question', history: [], turnstileToken: 'fake-token-1' });
  });

  it('the token is never in history, sessionStorage or the next request history; each message gets a fresh token', async () => {
    const t = loadWidget();
    openChat();
    fireLoad();
    send('First question');
    await vi.waitFor(() => expect(t.reset).toHaveBeenCalledTimes(1));
    send('Second question');
    await vi.waitFor(() => expect(t.reset).toHaveBeenCalledTimes(2));
    expect(sentBody(1).turnstileToken).toBe('fake-token-2');
    expect(JSON.stringify(sentBody(1).history)).not.toContain('fake-token');
    expect(sessionStorage.getItem('fns_chat_history')).not.toContain('fake-token');
    expect(document.body.textContent).not.toContain('fake-token');
  });

  it('a used token is never sent twice: if no new token has arrived, the next Send waits', async () => {
    const t = loadWidget();
    openChat();
    fireLoad();
    t.autoToken = false; // the reset after this message brings no new token
    send('First');
    await vi.waitFor(() => expect(t.reset).toHaveBeenCalledTimes(1));
    send('Second');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(status()).toBe(VERIFYING));
  });

  it('reset is called after a successful request', async () => {
    const t = loadWidget();
    openChat();
    fireLoad();
    send();
    await vi.waitFor(() => expect(t.reset).toHaveBeenCalledWith('fake-widget'));
  });

  it('reset is called after a failed request', async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const t = loadWidget();
    openChat();
    fireLoad();
    send();
    await vi.waitFor(() => expect(t.reset).toHaveBeenCalledWith('fake-widget'));
  });

  it('a 403 verification response is shown, not stored in history, and the widget is reset', async () => {
    okFetch({ error: VERIFY_403 });
    const t = loadWidget();
    openChat();
    fireLoad();
    send('Hello there');
    await vi.waitFor(() => expect(t.reset).toHaveBeenCalledTimes(1));
    const bots = document.querySelectorAll('.fns-msg-bot');
    expect(bots[bots.length - 1].lastChild.textContent).toBe(VERIFY_403);
    expect(sessionStorage.getItem('fns_chat_history')).not.toContain(VERIFY_403);
    await vi.waitFor(() => expect(status()).toBe(`Assistant: ${VERIFY_403}`));
  });
});

describe('callbacks and load failures', () => {
  it.each(['expired-callback', 'timeout-callback'])('%s clears the token and resets the widget', async (name) => {
    const t = loadWidget();
    openChat();
    fireLoad();
    t.autoToken = false;
    t.opts[name]();
    expect(t.reset).toHaveBeenCalledWith('fake-widget');
    send();
    expect(global.fetch).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(status()).toBe(VERIFYING));
  });

  it('error-callback clears the token, shows and announces the could-not-load notice, and never sends', async () => {
    const t = loadWidget();
    openChat();
    fireLoad();
    t.opts['error-callback']();
    expect(notice().hidden).toBe(false);
    expect(notice().textContent).toContain(LOAD_FAILED);
    expect(notice().querySelector('a').getAttribute('href')).toBe('contact.html');
    await vi.waitFor(() => expect(status()).toBe(LOAD_FAILED));
    send();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(t.render).toHaveBeenCalledTimes(1); // no retry
  });

  it('script onerror shows the could-not-load notice, never sends, and never adds a second script', async () => {
    const t = loadWidget();
    openChat();
    scripts()[0].onerror();
    expect(notice().textContent).toContain(LOAD_FAILED);
    expect($('#fnsChatSend').getAttribute('aria-disabled')).toBe('true');
    await vi.waitFor(() => expect(status()).toBe(LOAD_FAILED));
    send();
    expect(global.fetch).not.toHaveBeenCalled();
    closeChat();
    openChat();
    expect(scripts()).toHaveLength(1);
    expect(t.render).not.toHaveBeenCalled();
  });

  it('a script that loads without window.turnstile, or a render that throws, shows the could-not-load notice', () => {
    loadWidget();
    delete window.turnstile;
    openChat();
    fireLoad();
    expect(notice().textContent).toContain(LOAD_FAILED);

    document.body.innerHTML = '<main></main><footer></footer>';
    document.head.innerHTML = '';
    const t = loadWidget();
    t.render.mockImplementation(() => { throw new Error('bad sitekey'); });
    openChat();
    fireLoad();
    expect(notice().textContent).toContain(LOAD_FAILED);
    send();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

// Gate 2 chunk 6b: the widget follows the site's own theme (Gate 1 A3), read the way
// js/theme-init.js and js/main.js apply it: <html data-theme>, else the OS preference.
function stubOsPreference(light) {
  const listeners = [];
  const mql = { matches: light, addEventListener: (type, fn) => listeners.push(fn) };
  window.matchMedia = vi.fn((q) => (q === '(prefers-color-scheme: light)' ? mql : { matches: false, addEventListener() {} }));
  return { flip: (next) => { mql.matches = next; listeners.forEach((fn) => fn({ matches: next })); } };
}
// Each loadWidget() watches the same <html> element; on a real page there is one widget.
// Disconnect the previous tests' observers so only this test's widget reacts.
const observers = [];
const RealMutationObserver = window.MutationObserver;
beforeEach(() => {
  window.MutationObserver = class extends RealMutationObserver {
    constructor(cb) { super(cb); observers.push(this); }
  };
});
afterEach(() => {
  observers.splice(0).forEach((o) => o.disconnect());
  window.MutationObserver = RealMutationObserver;
});
const flush = () => new Promise((r) => setTimeout(r, 0)); // MutationObserver callbacks run as microtasks

describe('theme (Gate 2 chunk 6b)', () => {
  it.each([
    ['saved light -> light', 'light', null, 'light'],
    ['saved dark -> dark', 'dark', true, 'dark'],
    ['no choice, OS light -> light', null, true, 'light'],
    ['no choice, OS dark -> dark', null, false, 'dark'],
    ['no choice, no matchMedia -> dark', null, null, 'dark'],
  ])('%s', (_name, saved, osLight, expected) => {
    if (saved) document.documentElement.setAttribute('data-theme', saved);
    if (osLight !== null) stubOsPreference(osLight);
    const t = loadWidget();
    openChat();
    fireLoad();
    expect(t.render.mock.calls[0][1].theme).toBe(expected);
    expect(WIDGET_SRC).not.toMatch(/theme: 'auto'/);
  });

  it('a theme switch with no request in flight removes the widget, renders once with the new theme and clears the token', async () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    const t = loadWidget();
    openChat();
    fireLoad();
    t.autoToken = false; // the re-render brings no token, so the old one must be gone
    document.documentElement.setAttribute('data-theme', 'light');
    await flush();
    expect(t.remove).toHaveBeenCalledTimes(1);
    expect(t.remove).toHaveBeenCalledWith('fake-widget');
    expect(t.render).toHaveBeenCalledTimes(2);
    expect(t.render.mock.calls[1][1].theme).toBe('light');
    expect(t.remove.mock.invocationCallOrder[0]).toBeLessThan(t.render.mock.invocationCallOrder[1]); // never two widgets
    send();
    expect(global.fetch).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(status()).toBe(VERIFYING));
  });

  it('setting the same theme again does not re-render', async () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    const t = loadWidget();
    openChat();
    fireLoad();
    document.documentElement.setAttribute('data-theme', 'dark');
    await flush();
    expect(t.render).toHaveBeenCalledTimes(1);
    expect(t.remove).not.toHaveBeenCalled();
  });

  it('a theme switch during a request re-renders only after the request ends, once, instead of a reset', async () => {
    let resolveFetch;
    global.fetch = vi.fn(() => new Promise((r) => { resolveFetch = r; }));
    document.documentElement.setAttribute('data-theme', 'dark');
    const t = loadWidget();
    openChat();
    fireLoad();
    send('Hello');
    document.documentElement.setAttribute('data-theme', 'light');
    await flush();
    expect(t.render).toHaveBeenCalledTimes(1);
    expect(t.remove).not.toHaveBeenCalled();
    resolveFetch({ json: () => Promise.resolve({ reply: 'ok' }) });
    await vi.waitFor(() => expect(t.render).toHaveBeenCalledTimes(2));
    expect(t.render.mock.calls[1][1].theme).toBe('light');
    expect(t.remove).toHaveBeenCalledTimes(1);
    expect(t.reset).not.toHaveBeenCalled();
    send('Second');
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(sentBody(1).turnstileToken).toBe('fake-token-2');
  });

  it('with no saved choice, an OS theme flip re-renders with the new theme', async () => {
    const os = stubOsPreference(false);
    const t = loadWidget();
    openChat();
    fireLoad();
    expect(t.render.mock.calls[0][1].theme).toBe('dark');
    os.flip(true);
    expect(t.render).toHaveBeenCalledTimes(2);
    expect(t.render.mock.calls[1][1].theme).toBe('light');
    expect(t.remove).toHaveBeenCalledTimes(1);
  });

  it('no re-render after a verification failure, and nothing before the widget exists', async () => {
    const t = loadWidget();
    document.documentElement.setAttribute('data-theme', 'light'); // before the first open
    await flush();
    openChat();
    fireLoad();
    expect(t.render).toHaveBeenCalledTimes(1);
    expect(t.render.mock.calls[0][1].theme).toBe('light');
    t.opts['error-callback']();
    document.documentElement.setAttribute('data-theme', 'dark');
    await flush();
    expect(t.render).toHaveBeenCalledTimes(1);
    expect(t.remove).not.toHaveBeenCalled();
  });
});
