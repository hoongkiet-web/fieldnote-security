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

function lastBotMessageText() {
  const messages = document.querySelectorAll('.fns-msg-bot');
  return messages[messages.length - 1].textContent;
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
