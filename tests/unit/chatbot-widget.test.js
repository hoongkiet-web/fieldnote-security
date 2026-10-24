// FS-139: narrowly scoped to the one real, previously-untested gap found in
// Gate 1 - the reply-extraction fallback chain in chatbot-widget.js
// (`data.reply || data.error || 'Something went wrong...'`). This is NOT a
// general test suite for the widget - every event/DOM-interaction path
// (Enter/Shift+Enter/IME, Escape/Tab-trap, focus-return, the mobile-menu
// mutual exclusion, the re-entry guard) is already covered by real
// Playwright tests in qa/chatbot-enter-to-send.spec.js,
// qa/chatbot-panel-a11y.spec.js, and qa/chatbot-rapid-resubmission.spec.js -
// duplicating that here in jsdom would add maintenance cost for no new
// safety, which is exactly why FS-74's testing standard stays scoped to the
// scanner repo for everything else.
//
// chatbot-widget.js is a plain, unexported IIFE (a classic <script defer>
// file, no module system) - there is nothing to `import` from it. Instead
// its real source (and form-guard.js's, since chatbot-widget.js calls
// `window.__fnsGuardAgainstReentry` synchronously while the IIFE runs) is
// loaded and eval'd fresh against jsdom's real `document`/`window` for each
// test, exactly as a browser would execute two deferred <script> tags in
// order. This is deliberately real source, not a reimplementation - a
// change to the actual shipped fallback-chain line will be caught here.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FORM_GUARD_SRC = fs.readFileSync(path.resolve(__dirname, '../../js/form-guard.js'), 'utf-8');
const WIDGET_SRC = fs.readFileSync(path.resolve(__dirname, '../../js/chatbot-widget.js'), 'utf-8');

function loadWidget() {
  // eslint-disable-next-line no-eval
  (0, eval)(FORM_GUARD_SRC);
  // eslint-disable-next-line no-eval
  (0, eval)(WIDGET_SRC);
}

// The visible message text: since a11y chunk 2 each message starts with a
// screen-reader-only speaker label (asserted separately below), so read the
// message's own text node rather than the whole element's textContent.
function lastBotMessageText() {
  const messages = document.querySelectorAll('.fns-msg-bot');
  return messages[messages.length - 1].lastChild.textContent;
}

async function sendMessageAndGetMockedResponse(mockResponse) {
  global.fetch = vi.fn().mockResolvedValue({
    json: () => Promise.resolve(mockResponse),
  });
  loadWidget();

  const input = document.querySelector('#fnsChatInput');
  const sendBtn = document.querySelector('#fnsChatSend');
  input.value = 'What services do you offer?';
  sendBtn.click();

  // Real greeting (1) + the user's own message rendered synchronously (not
  // a .fns-msg-bot) + the assistant reply once the mocked fetch's promise
  // chain settles - wait for the second bot message rather than a fixed
  // delay, matching this project's own "don't assume, wait for the real
  // settled state" convention used throughout its Playwright suite.
  await vi.waitFor(() => {
    expect(document.querySelectorAll('.fns-msg-bot').length).toBeGreaterThanOrEqual(2);
  });
}

describe('chatbot-widget.js: reply-extraction fallback chain (data.reply || data.error || fallback)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    delete window.__fnsGuardAgainstReentry;
    delete window.__fnsChatPanel;
    delete window.__fnsMobileMenu;
    try {
      sessionStorage.clear();
    } catch (e) {
      /* not available in this environment - fine, widget already handles this */
    }
  });

  it('renders data.reply when the backend returns a normal reply', async () => {
    await sendMessageAndGetMockedResponse({ reply: "Fieldnote Security offers six services, including a free DNS Health check." });
    expect(lastBotMessageText()).toBe("Fieldnote Security offers six services, including a free DNS Health check.");
  });

  it('falls back to data.error when reply is missing (e.g. a validation/rate-limit failure)', async () => {
    await sendMessageAndGetMockedResponse({ error: 'The assistant is temporarily unavailable. Please email contact@fieldnotesecurity.com.' });
    expect(lastBotMessageText()).toBe('The assistant is temporarily unavailable. Please email contact@fieldnotesecurity.com.');
  });

  it('falls back to the generic message when the response has neither reply nor error', async () => {
    await sendMessageAndGetMockedResponse({});
    expect(lastBotMessageText()).toBe('Something went wrong - please try again.');
  });

  it('shows the network-failure fallback text when fetch itself rejects (not a parsed response at all)', async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    loadWidget();

    const input = document.querySelector('#fnsChatInput');
    document.querySelector('#fnsChatSend');
    input.value = 'Hello';
    document.querySelector('#fnsChatSend').click();

    await vi.waitFor(() => {
      expect(document.querySelectorAll('.fns-msg-bot').length).toBeGreaterThanOrEqual(2);
    });
    expect(lastBotMessageText()).toBe(
      'Something went wrong - please try again, or email contact@fieldnotesecurity.com.'
    );
  });
});

// FS-170 chunk 3: the endpoint choice by hostname. The real source is run with
// a stand-in `location` (same approach as monitor-alert.test.js), so the page
// hostname can be chosen without touching jsdom's own window.location.
describe('chatbot-widget.js: request history is capped at 6 entries', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    delete window.__fnsGuardAgainstReentry;
    delete window.__fnsChatPanel;
    delete window.__fnsMobileMenu;
    try { sessionStorage.clear(); } catch (e) { /* not available - fine */ }
  });

  // Gate 2 chunk 1 (B6): the worker keeps user entries only, so the widget sends
  // only the visitor's own earlier messages - the newest 6, in order.
  it('with 10 earlier mixed entries, sends only the newest 6 user entries in order, never the current message, and keeps all 10 on screen', async () => {
    // 8 user entries (m0-m2, m4-m6, m8-m9) and 2 assistant entries (m3, m7).
    const earlier = [];
    for (let i = 0; i < 10; i++) earlier.push({ role: i === 3 || i === 7 ? 'assistant' : 'user', content: `m${i}` });
    sessionStorage.setItem('fns_chat_history', JSON.stringify(earlier));
    const fetchMock = vi.fn().mockResolvedValue({ json: () => Promise.resolve({ reply: 'ok' }) });
    global.fetch = fetchMock;
    loadWidget();

    expect(document.querySelectorAll('.fns-msg').length).toBe(10);
    document.querySelector('#fnsChatInput').value = 'newest';
    document.querySelector('#fnsChatSend').click();

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.message).toBe('newest');
    expect(sent.history).toEqual(['m2', 'm4', 'm5', 'm6', 'm8', 'm9'].map((content) => ({ role: 'user', content })));
    expect(sent.history.length).toBeLessThanOrEqual(6);
    expect(sent.history.some((m) => m.content === 'newest')).toBe(false);
    expect(document.body.textContent).toContain('m0');
  });

  it('the request body never contains an assistant entry, even after a stored reply', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ json: () => Promise.resolve({ reply: 'first answer' }) });
    global.fetch = fetchMock;
    loadWidget();

    document.querySelector('#fnsChatInput').value = 'first question';
    document.querySelector('#fnsChatSend').click();
    await vi.waitFor(() => expect(document.querySelectorAll('.fns-msg-bot')).toHaveLength(2));
    document.querySelector('#fnsChatInput').value = 'second question';
    document.querySelector('#fnsChatSend').click();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    const second = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(second.history).toEqual([{ role: 'user', content: 'first question' }]);
    for (const call of fetchMock.mock.calls) {
      expect(JSON.parse(call[1].body).history.every((m) => m.role === 'user')).toBe(true);
    }
  });
});

// Gate 2 chunk 1 (B5): error and fallback text is shown but never stored, so it
// is not re-shown after a page change and never sent as history.
describe('chatbot-widget.js: error text is shown but not stored', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    delete window.__fnsGuardAgainstReentry;
    delete window.__fnsChatPanel;
    delete window.__fnsMobileMenu;
    try { sessionStorage.clear(); } catch (e) { /* not available - fine */ }
  });

  const stored = () => JSON.parse(sessionStorage.getItem('fns_chat_history') || '[]');

  async function sendThenSendAgain(firstResponse) {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ json: () => Promise.resolve(firstResponse) })
      .mockResolvedValue({ json: () => Promise.resolve({ reply: 'ok' }) });
    global.fetch = fetchMock;
    loadWidget();
    document.querySelector('#fnsChatInput').value = 'first';
    document.querySelector('#fnsChatSend').click();
    await vi.waitFor(() => expect(document.querySelectorAll('.fns-msg-bot')).toHaveLength(2));
    const afterFirst = stored();
    document.querySelector('#fnsChatInput').value = 'second';
    document.querySelector('#fnsChatSend').click();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    return { afterFirst, next: JSON.parse(fetchMock.mock.calls[1][1].body) };
  }

  it('a 429 error is rendered but is in neither sessionStorage nor the next request history', async () => {
    const error = 'Rate limit reached. Please try again later, or email contact@fieldnotesecurity.com directly.';
    const { afterFirst, next } = await sendThenSendAgain({ error });
    expect(document.querySelectorAll('.fns-msg-bot')[1].lastChild.textContent).toBe(error);
    expect(afterFirst).toEqual([{ role: 'user', content: 'first' }]);
    expect(JSON.stringify(next.history)).not.toContain(error);
    expect(next.history).toEqual([{ role: 'user', content: 'first' }]);
  });

  it('a reply-less 200 shows the fallback text but does not store it', async () => {
    const { afterFirst, next } = await sendThenSendAgain({});
    expect(document.querySelectorAll('.fns-msg-bot')[1].lastChild.textContent).toBe('Something went wrong - please try again.');
    expect(afterFirst).toEqual([{ role: 'user', content: 'first' }]);
    expect(JSON.stringify(next.history)).not.toContain('Something went wrong');
  });

  it('a normal reply is still stored and persisted', async () => {
    const { afterFirst } = await sendThenSendAgain({ reply: 'real answer' });
    expect(afterFirst).toEqual([
      { role: 'user', content: 'first' },
      { role: 'assistant', content: 'real answer' },
    ]);
  });
});

describe('chatbot-widget.js: endpoint by hostname (FS-170 chunk 3)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    delete window.__fnsGuardAgainstReentry;
    delete window.__fnsChatPanel;
    delete window.__fnsMobileMenu;
    try { sessionStorage.clear(); } catch (e) { /* not available - fine */ }
  });

  it.each([
    ['fieldnotesecurity.com', 'https://fieldnotesecurity.com/api/chat'],
    ['www.fieldnotesecurity.com', 'https://fieldnotesecurity.com/api/chat'],
    ['staging.fieldnotesecurity.com', '/api/chat'],
    ['localhost', '/api/chat'],
    ['127.0.0.1', '/api/chat'],
    ['unknown.example', '/api/chat'],
  ])('host %s posts to %s, never workers.dev, credentials not omitted', async (hostname, expected) => {
    const fetchMock = vi.fn().mockResolvedValue({ json: () => Promise.resolve({ reply: 'ok' }) });
    global.fetch = fetchMock;
    // eslint-disable-next-line no-eval
    (0, eval)(FORM_GUARD_SRC);
    new Function('location', WIDGET_SRC)({ hostname });

    document.querySelector('#fnsChatInput').value = 'Hello';
    document.querySelector('#fnsChatSend').click();

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(expected);
    expect(String(url)).not.toContain('workers.dev');
    expect(init.method).toBe('POST');
    expect(init.credentials === undefined || init.credentials === 'same-origin' || init.credentials === 'include').toBe(true);
  });
});

// a11y chunk 2: dialog semantics (F7), live region (F2), speaker labels (F10),
// input border token (F6). fetch is always a mock; nothing reaches a live endpoint.
describe('chatbot-widget.js: accessibility semantics (a11y chunk 2)', () => {
  beforeEach(() => {
    document.body.innerHTML = '<main></main><footer></footer>';
    document.head.innerHTML = '';
    delete window.__fnsGuardAgainstReentry;
    delete window.__fnsChatPanel;
    delete window.__fnsMobileMenu;
    try { sessionStorage.clear(); } catch (e) { /* not available - fine */ }
    global.fetch = vi.fn().mockResolvedValue({ json: () => Promise.resolve({ reply: 'ok' }) });
  });

  const launcher = () => document.querySelector('.fns-chat-btn');
  const panel = () => document.querySelector('.fns-chat-panel');

  it('the panel is a labelled modal dialog and the launcher controls it', () => {
    loadWidget();
    const p = panel();
    expect(p.id).toBe('fnsChatPanel');
    expect(p.getAttribute('role')).toBe('dialog');
    expect(p.getAttribute('aria-modal')).toBe('true');
    const title = document.getElementById(p.getAttribute('aria-labelledby'));
    expect(title.tagName).toBe('H2');
    expect(title.textContent).toBe('Fieldnote Security assistant');
    expect(launcher().getAttribute('aria-controls')).toBe('fnsChatPanel');
    expect(launcher().getAttribute('aria-label')).toBe('Chat assistant');
    expect(launcher().getAttribute('aria-expanded')).toBe('false');
  });

  it('aria-expanded follows open and close by launcher click, Escape and the close button', () => {
    loadWidget();
    const expanded = () => launcher().getAttribute('aria-expanded');
    launcher().click();
    expect(expanded()).toBe('true');
    launcher().click();
    expect(expanded()).toBe('false');
    launcher().click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(expanded()).toBe('false');
    launcher().click();
    expect(expanded()).toBe('true');
    document.querySelector('.fns-chat-close').click();
    expect(expanded()).toBe('false');
  });

  it('#fnsChatBody becomes a polite log only after the restored history is rendered', () => {
    sessionStorage.setItem('fns_chat_history', JSON.stringify([
      { role: 'user', content: 'earlier question' },
      { role: 'assistant', content: 'earlier answer' },
    ]));
    // Record the moment each restored message is appended: the body must not be a live region yet.
    const seen = [];
    const original = Element.prototype.appendChild;
    const spy = vi.spyOn(Element.prototype, 'appendChild').mockImplementation(function (child) {
      if (this.id === 'fnsChatBody') seen.push(this.getAttribute('role'));
      return original.call(this, child);
    });
    loadWidget();
    spy.mockRestore();
    expect(seen).toEqual([null, null]);
    const body = document.getElementById('fnsChatBody');
    expect(body.getAttribute('role')).toBe('log');
    expect(body.getAttribute('aria-live')).toBe('polite');
    expect(body.getAttribute('aria-label')).toBe('Conversation');
    expect(body.querySelectorAll('.fns-msg')).toHaveLength(2);
  });

  it('a mocked reply appends a message with the "Assistant: " label; the user message has "You said: "', async () => {
    loadWidget();
    document.querySelector('#fnsChatInput').value = 'Hello there';
    document.querySelector('#fnsChatSend').click();
    await vi.waitFor(() => expect(document.querySelectorAll('.fns-msg-bot')).toHaveLength(2));
    const bot = document.querySelectorAll('.fns-msg-bot')[1];
    expect(bot.querySelector('.sr-only').textContent).toBe('Assistant:\u00a0');
    expect(bot.textContent).toBe('Assistant:\u00a0ok');
    const user = document.querySelector('.fns-msg-user');
    expect(user.querySelector('.sr-only').textContent).toBe('You said:\u00a0');
    expect(user.lastChild.nodeType).toBe(Node.TEXT_NODE);
    expect(user.lastChild.textContent).toBe('Hello there');
  });

  // Gate 2 chunk 1 (B4): a plain trailing space collapses at the end of the
  // absolutely positioned .sr-only span ("You said:why"), a no-break space does not.
  it('both speaker labels end with a no-break space (U+00A0), not a plain space', async () => {
    loadWidget();
    document.querySelector('#fnsChatInput').value = 'why';
    document.querySelector('#fnsChatSend').click();
    await vi.waitFor(() => expect(document.querySelectorAll('.fns-msg-bot')).toHaveLength(2));
    const labels = [document.querySelector('.fns-msg-user .sr-only'), document.querySelectorAll('.fns-msg-bot')[1].querySelector('.sr-only')];
    for (const label of labels) {
      expect(label.textContent.endsWith('\u00a0')).toBe(true);
      expect(label.textContent).not.toMatch(/ $/);
    }
  });

  it('message text is never parsed as HTML', async () => {
    global.fetch = vi.fn().mockResolvedValue({ json: () => Promise.resolve({ reply: '<img src=x onerror=alert(1)>' }) });
    loadWidget();
    document.querySelector('#fnsChatInput').value = '<b>bold</b>';
    document.querySelector('#fnsChatSend').click();
    await vi.waitFor(() => expect(document.querySelectorAll('.fns-msg-bot')).toHaveLength(2));
    expect(document.querySelector('#fnsChatBody img')).toBeNull();
    expect(document.querySelector('#fnsChatBody b')).toBeNull();
  });

  it('the status element says "Assistant is replying" while waiting and is cleared after the reply', async () => {
    let resolve;
    global.fetch = vi.fn(() => new Promise((r) => { resolve = r; }));
    loadWidget();
    const status = document.getElementById('fnsChatStatus');
    expect(status.getAttribute('role')).toBe('status');
    expect(status.classList.contains('sr-only')).toBe(true);
    expect(panel().contains(status)).toBe(true);
    document.querySelector('#fnsChatInput').value = 'Hi';
    document.querySelector('#fnsChatSend').click();
    expect(status.textContent).toBe('Assistant is replying');
    resolve({ json: () => Promise.resolve({ reply: 'done' }) });
    await vi.waitFor(() => expect(status.textContent).toBe(''));
  });

  it('the status element is cleared when the request fails too', async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    loadWidget();
    document.querySelector('#fnsChatInput').value = 'Hi';
    document.querySelector('#fnsChatSend').click();
    await vi.waitFor(() => expect(document.querySelectorAll('.fns-msg-bot')).toHaveLength(2));
    expect(document.getElementById('fnsChatStatus').textContent).toBe('');
  });

  it('the injected style gives .fns-chat-input a var(--field-border) border', () => {
    loadWidget();
    const css = document.head.querySelector('style').textContent;
    expect(css).toMatch(/\.fns-chat-input\{[^}]*border:1px solid var\(--field-border\)/);
  });
});

// a11y chunk 3: focus stays in the chat while a reply is pending (F4), and the
// close button is a 44 px target (B3). fetch is always a mock.
describe('chatbot-widget.js: focus during send and close target (a11y chunk 3)', () => {
  let resolveFetch;
  beforeEach(() => {
    document.body.innerHTML = '<main></main><footer></footer>';
    document.head.innerHTML = '';
    delete window.__fnsGuardAgainstReentry;
    delete window.__fnsChatPanel;
    delete window.__fnsMobileMenu;
    try { sessionStorage.clear(); } catch (e) { /* not available - fine */ }
    global.fetch = vi.fn(() => new Promise((r) => { resolveFetch = r; }));
  });

  const els = () => ({
    input: document.querySelector('#fnsChatInput'),
    send: document.querySelector('#fnsChatSend'),
    form: document.querySelector('#fnsChatForm'),
  });
  // Open the panel (focus goes to the textarea), type, press Enter: the keyboard path.
  function sendWithEnter(text) {
    document.querySelector('.fns-chat-btn').click();
    const { input } = els();
    input.value = text;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  }

  it('while the reply is pending, focus stays on the textarea, it is read-only, send is aria-disabled and the form is busy', () => {
    loadWidget();
    sendWithEnter('Hello');
    const { input, send, form } = els();
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(input);
    expect(input.readOnly).toBe(true);
    expect(input.disabled).toBe(false);
    expect(send.getAttribute('aria-disabled')).toBe('true');
    expect(send.disabled).toBe(false);
    expect(form.getAttribute('aria-busy')).toBe('true');
  });

  it('after the reply, the textarea is editable again, aria-disabled and aria-busy are gone, focus is on the textarea', async () => {
    loadWidget();
    sendWithEnter('Hello');
    resolveFetch({ json: () => Promise.resolve({ reply: 'done' }) });
    const { input, send, form } = els();
    await vi.waitFor(() => expect(input.readOnly).toBe(false));
    expect(send.hasAttribute('aria-disabled')).toBe(false);
    expect(form.hasAttribute('aria-busy')).toBe(false);
    expect(document.activeElement).toBe(input);
  });

  it('the same reset happens after a failed request', async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    loadWidget();
    sendWithEnter('Hello');
    const { input, send, form } = els();
    await vi.waitFor(() => expect(input.readOnly).toBe(false));
    expect(send.hasAttribute('aria-disabled')).toBe(false);
    expect(form.hasAttribute('aria-busy')).toBe(false);
  });

  it('a second submit while the first is pending does not call fetch again (Send click and Enter)', () => {
    loadWidget();
    sendWithEnter('First');
    const { input, send } = els();
    input.value = 'Second';
    send.click();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  // The re-entry guard drops a second submit without calling preventDefault, and
  // since chunk 3 Send and the textarea stay usable while a reply is pending, so
  // the widget must cancel the native submission itself: otherwise the browser
  // submits the chat form (a GET to the current page) and the page reloads.
  it('every submit is default-prevented, including the ones dropped while a reply is pending', () => {
    const seen = [];
    const record = (e) => seen.push(e.defaultPrevented);
    window.addEventListener('submit', record);
    try {
      loadWidget();
      sendWithEnter('First');
      const { input, send } = els();
      input.value = 'Second';
      send.click();
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    } finally {
      window.removeEventListener('submit', record);
    }
    expect(seen).toEqual([true, true, true]);
  });

  it('the close button is a 44 x 44 px flex-centred target, and the send style also matches aria-disabled', () => {
    loadWidget();
    const css = document.head.querySelector('style').textContent;
    const close = css.match(/\.fns-chat-close\{([^}]*)\}/)[1];
    for (const decl of ['width:44px', 'height:44px', 'display:flex', 'align-items:center', 'justify-content:center', 'top:2px', 'right:2px']) {
      expect(close).toContain(decl);
    }
    expect(css).toContain('.fns-chat-send:disabled,.fns-chat-send[aria-disabled="true"]{opacity:0.5;cursor:not-allowed;}');
  });
});

// a11y chunk 6a (F3, WCAG 1.4.10): full-height sheet under 500px tall. jsdom has
// no layout, so these check the injected CSS text, not rendered sizes.
describe('chatbot-widget.js: short-screen sheet (a11y chunk 6a)', () => {
  const styleText = () => {
    loadWidget();
    return document.head.querySelector('style').textContent;
  };

  it('head, form and disclaimer never shrink and the body may shrink to 0', () => {
    const css = styleText();
    expect(css).toContain('.fns-chat-head,.fns-chat-form,.fns-chat-disclaimer{flex-shrink:0;}');
    expect(css).toContain('.fns-chat-body{min-height:0;}');
  });

  it('under 500px tall the panel is a full-height scrolling sheet and history keeps 96px', () => {
    const block = styleText().match(/@media \(max-height:500px\)\{(.*)\}$/)[1];
    const panel = block.match(/\.fns-chat-panel\{([^}]*)\}/)[1];
    for (const decl of ['top:8px', 'bottom:8px', 'right:8px', 'max-height:none', 'width:min(360px,calc(100vw - 16px))', 'overflow-y:auto']) {
      expect(panel).toContain(decl);
    }
    expect(block).toContain('.fns-chat-body{flex:1 0 96px;}');
  });

  it('the normal panel rule is unchanged (bottom 88px, same max-height)', () => {
    const css = styleText();
    expect(css).toContain('.fns-chat-panel{position:fixed;bottom:88px;right:20px;width:min(360px,calc(100vw - 40px));'
      + 'max-height:min(520px,calc(100vh - 140px));');
    expect(css.indexOf('.fns-chat-panel{position:fixed;bottom:88px')).toBeLessThan(css.indexOf('@media (max-height:500px)'));
  });
});
