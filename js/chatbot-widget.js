// Fieldnote Security chat widget.
// Self-contained: injects its own styles and markup, talks to the
// Cloudflare Worker backend. Add <script src="js/chatbot-widget.js" defer></script>
// before </body> on any page once the worker is deployed and the
// system prompt has been reviewed.
(function () {
  // Auto-detects environment by hostname so this same file works
  // correctly on both staging and production without needing an edit
  // (and possibly forgetting to revert it) at merge time.
  // FS-170 chunk 3: every non-production host (staging.fieldnotesecurity.com,
  // localhost, anything else) calls the same-origin relative /api/chat. On
  // staging that is the staging chatbot's zone route, behind the Cloudflare
  // Access app; the staging workers.dev URL is gone (FS-170 chunk 1).
  var PRODUCTION_HOSTS = ['fieldnotesecurity.com', 'www.fieldnotesecurity.com'];
  var ENDPOINT = PRODUCTION_HOSTS.indexOf(location.hostname) !== -1
    ? 'https://fieldnotesecurity.com/api/chat'
    : '/api/chat';
  var STORAGE_KEY = 'fns_chat_history';
  var history = [];

  try {
    var saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) history = JSON.parse(saved);
  } catch (e) { /* sessionStorage unavailable, start fresh */ }

  var style = document.createElement('style');
  style.textContent = [
    '.fns-chat-btn{position:fixed;bottom:20px;right:20px;width:56px;height:56px;border-radius:50%;',
    'background:var(--accent);color:var(--on-accent);border:none;cursor:pointer;z-index:9998;display:flex;align-items:center;',
    'justify-content:center;box-shadow:0 4px 16px var(--shadow-strong);transition:transform .15s var(--ease-out);}',
    '.fns-chat-btn:hover{transform:scale(1.06);}',
    '.fns-chat-btn svg{width:24px;height:24px;}',
    '.fns-chat-panel{position:fixed;bottom:88px;right:20px;width:min(360px,calc(100vw - 40px));',
    'max-height:min(520px,calc(100vh - 140px));background:var(--bg-elevated);border:1px solid var(--border);',
    'border-radius:12px;box-shadow:0 12px 40px var(--shadow-strong);z-index:9999;display:none;flex-direction:column;',
    'font-family:var(--font-body);overflow:hidden;}',
    '.fns-chat-panel.open{display:flex;}',
    '.fns-chat-head{padding:14px 48px 14px 16px;border-bottom:1px solid var(--border-subtle);background:var(--bg-elevated);}',
    '.fns-chat-head h2{font-family:var(--font-display);font-size:0.95rem;color:var(--text-primary);margin-bottom:2px;}',
    '.fns-chat-head p{font-size:0.72rem;color:var(--text-secondary);}',
    '.fns-chat-close{position:absolute;top:2px;right:2px;width:44px;height:44px;display:flex;align-items:center;',
    'justify-content:center;background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:1.1rem;line-height:1;}',
    '.fns-chat-body{flex:1;overflow-y:auto;padding:12px 16px;display:flex;flex-direction:column;gap:10px;}',
    '.fns-msg{max-width:85%;padding:8px 12px;border-radius:10px;font-size:0.86rem;line-height:1.5;}',
    '.fns-msg-user{align-self:flex-end;background:var(--accent-dim);border:1px solid var(--accent-border);color:var(--text-primary);}',
    '.fns-msg-bot{align-self:flex-start;background:var(--bg);border:1px solid var(--border-subtle);color:var(--text-primary);}',
    '.fns-msg-bot a{text-decoration:underline;}',
    '.fns-chat-form{display:flex;gap:8px;padding:12px 16px;border-top:1px solid var(--border-subtle);}',
    '.fns-chat-input{flex:1;background:var(--bg);border:1px solid var(--field-border);border-radius:8px;color:var(--text-primary);',
    'padding:8px 10px;font-size:0.85rem;font-family:var(--font-body);resize:none;}',
    '.fns-chat-input:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-dim);}',
    '.fns-chat-send{background:var(--accent);border:none;border-radius:8px;padding:0 14px;color:var(--on-accent);',
    'font-weight:600;font-size:0.85rem;cursor:pointer;}',
    '.fns-chat-send:disabled,.fns-chat-send[aria-disabled="true"]{opacity:0.5;cursor:not-allowed;}',
    '.fns-chat-disclaimer{font-size:0.66rem;color:var(--text-secondary);padding:0 16px 10px;}',
    // a11y F3 (WCAG 1.4.10): only the history shrinks, so the close button, form and disclaimer are never clipped.
    '.fns-chat-head,.fns-chat-form,.fns-chat-disclaimer{flex-shrink:0;}',
    '.fns-chat-body{min-height:0;}',
    // Short viewports (e.g. 400% zoom): full-height sheet; history keeps 96px and the panel scrolls instead of clipping.
    // The panel stacks above the launcher (z-index 9999 vs 9998), so bottom:8px leaves Send uncovered.
    '@media (max-height:500px){',
    '.fns-chat-panel{top:8px;bottom:8px;right:8px;max-height:none;width:min(360px,calc(100vw - 16px));overflow-y:auto;}',
    '.fns-chat-body{flex:1 0 96px;}',
    '}',
  ].join('');
  document.head.appendChild(style);

  var btn = document.createElement('button');
  btn.className = 'fns-chat-btn';
  // The open/closed state is announced from aria-expanded, so the label names the control only.
  btn.setAttribute('aria-label', 'Chat assistant');
  btn.setAttribute('aria-controls', 'fnsChatPanel');
  btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>';

  var panel = document.createElement('div');
  panel.className = 'fns-chat-panel';
  panel.id = 'fnsChatPanel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-labelledby', 'fnsChatTitle');
  panel.innerHTML =
    '<div class="fns-chat-head">' +
      '<h2 id="fnsChatTitle">Fieldnote Security assistant</h2>' +
      '<p>AI assistant for general questions - contact us for a full assessment.</p>' +
      '<button class="fns-chat-close" aria-label="Close chat">&times;</button>' +
    '</div>' +
    '<div class="fns-chat-body" id="fnsChatBody"></div>' +
    '<div class="sr-only" role="status" id="fnsChatStatus"></div>' +
    '<form class="fns-chat-form" id="fnsChatForm">' +
      '<textarea class="fns-chat-input" id="fnsChatInput" rows="1" maxlength="800" placeholder="Ask about services, pricing..." aria-label="Message"></textarea>' +
      '<button type="submit" class="fns-chat-send" id="fnsChatSend">Send</button>' +
    '</form>' +
    '<p class="fns-chat-disclaimer">AI assistant, not a human - answers are general guidance, not legal advice and not a substitute for a full assessment.</p>';

  document.body.appendChild(btn);
  document.body.appendChild(panel);

  var body = panel.querySelector('#fnsChatBody');
  var form = panel.querySelector('#fnsChatForm');
  var input = panel.querySelector('#fnsChatInput');
  var sendBtn = panel.querySelector('#fnsChatSend');
  var closeBtn = panel.querySelector('.fns-chat-close');
  var statusEl = panel.querySelector('#fnsChatStatus');

  // FS-133: background the open panel overlays, for the same inert-based
  // trap FS-50 already uses for the mobile menu (js/main.js). Deliberately
  // main/footer only, NOT header - the mobile menu's own toggle button
  // (#menuBtn) lives inside <header>, and `inert` blocks clicks as well as
  // focus, so making header inert here would silently break the mutual-
  // exclusion requirement (clicking the hamburger while chat is open must
  // still work, to close chat and open the menu). btn/panel themselves are
  // appended directly to <body>, outside header/main/footer, so neither
  // widget's own toggle button is ever caught by the other's inert scope.
  var chatBackgroundEls = [document.querySelector('main'), document.querySelector('footer')];
  function setChatBackgroundInert(isInert) {
    chatBackgroundEls.forEach(function (el) {
      if (el) el.toggleAttribute('inert', isInert);
    });
  }

  // FS-133: named open/close functions (was inline toggle logic in the
  // click handler) - lets Escape and the close button share one close path,
  // and gives the mobile menu a stable hook to close this panel from.
  function openPanel() {
    // FS-133: mutual exclusion with the mobile menu - see the matching
    // comment in js/main.js's openMenu() for the full reasoning.
    if (window.__fnsMobileMenu && window.__fnsMobileMenu.isOpen && window.__fnsMobileMenu.isOpen()) {
      window.__fnsMobileMenu.close();
    }
    panel.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
    setChatBackgroundInert(true);
    input.focus();
  }

  function closePanel() {
    panel.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
    setChatBackgroundInert(false);
    // FS-133: explicit, not incidental - matches every other close path
    // (Escape, the close button) so focus never gets lost to <body>
    // regardless of which one the user used.
    btn.focus();
  }

  // FS-133: Escape-to-close plus a hand-rolled Tab trap - only two specific
  // boundary transitions need intercepting (forward off the last focusable
  // element, backward off the first), not every keypress, since the panel's
  // 3 focusable elements (close/input/send) already sit in the correct
  // order natively. One document-level listener rather than one scoped to
  // the panel: Escape must still work even if focus has drifted outside the
  // panel for any reason, and a single listener is simpler than adding/
  // removing one on every open/close.
  document.addEventListener('keydown', function (e) {
    if (!panel.classList.contains('open')) return;

    if (e.key === 'Escape') {
      closePanel();
      return;
    }

    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === closeBtn) {
        e.preventDefault();
        sendBtn.focus();
      } else if (!e.shiftKey && document.activeElement === sendBtn) {
        e.preventDefault();
        closeBtn.focus();
      }
    }
  });

  // FS-52: Enter-to-send, Shift+Enter for a newline. Scoped to the message
  // textarea itself, deliberately separate from FS-133's document-level
  // Escape/Tab-trap listener above - that listener's concern is open/close
  // and focus-trap behavior, not message sending, so this stays its own
  // listener rather than being folded in.
  input.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' || e.shiftKey) return;

    // IME composition in progress (e.g. confirming a CJK candidate) - let
    // the browser handle Enter normally rather than intercepting it.
    // Checks both signals since some browsers (notably older Safari/
    // Firefox) report isComposing inconsistently; keyCode 229 is the
    // long-standing fallback signal for "this keypress is part of an IME
    // composition."
    if (e.isComposing || e.keyCode === 229) return;

    // Always suppress the newline on a plain Enter, regardless of content,
    // before checking whether there's anything to send - reuses
    // form.requestSubmit() so the existing submit handler (and FS-60's
    // re-entry guard) applies with zero duplication; an empty message is a
    // silent no-op via that handler's own `if (!text) return;` guard.
    e.preventDefault();
    if (!input.value.trim()) return;
    form.requestSubmit();
  });

  function renderMessage(role, text) {
    var el = document.createElement('div');
    el.className = 'fns-msg ' + (role === 'user' ? 'fns-msg-user' : 'fns-msg-bot');
    // Who said it, for screen readers; the message itself stays a plain text node (never innerHTML).
    var speaker = document.createElement('span');
    speaker.className = 'sr-only';
    // No-break space: a plain trailing space collapses at the end of the absolutely positioned .sr-only span.
    speaker.textContent = role === 'user' ? 'You said:\u00a0' : 'Assistant:\u00a0';
    el.appendChild(speaker);
    el.appendChild(document.createTextNode(text));
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
  }

  function persist() {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-6))); } catch (e) {}
  }

  history.forEach(function (m) { renderMessage(m.role, m.content); });
  if (history.length === 0) {
    renderMessage('assistant', "Hi - I can answer questions about Fieldnote Security's services, pricing, or general cybersecurity topics. What would you like to know?");
  }
  // Made a live region only now, so the restored history and greeting are not re-announced on page load.
  body.setAttribute('role', 'log');
  body.setAttribute('aria-live', 'polite');
  body.setAttribute('aria-label', 'Conversation');

  btn.addEventListener('click', function () {
    if (panel.classList.contains('open')) closePanel();
    else openPanel();
  });
  closeBtn.addEventListener('click', closePanel);

  // FS-133: exposed so js/main.js's mobile menu can close this panel before
  // opening itself - see openMenu()'s matching check. Load-order-safe for
  // the same reason noted in js/main.js: both scripts execute (via defer)
  // before any user interaction is possible.
  window.__fnsChatPanel = {
    close: closePanel,
    isOpen: function () { return panel.classList.contains('open'); },
  };

  // Always cancel the native submission. The re-entry guard below drops a second
  // submit without calling preventDefault, and Send and the textarea stay usable
  // while a reply is pending (aria-disabled / readOnly), so without this a second
  // Enter or click would submit the form natively and reload the page.
  form.addEventListener('submit', function (e) { e.preventDefault(); });

  form.addEventListener('submit', window.__fnsGuardAgainstReentry(function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text) return;

    renderMessage('user', text);
    history.push({ role: 'user', content: text });
    persist();
    input.value = '';
    // Not disabled: disabling the focused control drops focus to <body> (WCAG 2.4.3).
    // The re-entry guard above already blocks a second submit while this one is pending.
    input.readOnly = true;
    sendBtn.setAttribute('aria-disabled', 'true');
    form.setAttribute('aria-busy', 'true');
    statusEl.textContent = 'Assistant is replying';

    return fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Only the visitor's own last 6 earlier messages go in the request (the worker
      // keeps user entries only and caps it too); the panel still shows the whole conversation.
      body: JSON.stringify({
        message: text,
        history: history.slice(0, -1).filter(function (m) { return m.role === 'user'; }).slice(-6),
      }),
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        statusEl.textContent = '';
        // Error and fallback text is shown but never stored, so it is not re-shown or sent as history.
        if (data.reply) {
          renderMessage('assistant', data.reply);
          history.push({ role: 'assistant', content: data.reply });
          persist();
        } else {
          renderMessage('assistant', data.error || 'Something went wrong - please try again.');
        }
      })
      .catch(function () {
        statusEl.textContent = '';
        renderMessage('assistant', "Something went wrong - please try again, or email contact@fieldnotesecurity.com.");
      })
      .finally(function () {
        input.readOnly = false;
        sendBtn.removeAttribute('aria-disabled');
        form.removeAttribute('aria-busy');
        input.focus();
      });
  }));
})();
