// Fieldnote Security chat widget.
// Self-contained: injects its own styles and markup, talks to the
// Cloudflare Worker backend. Add <script src="js/chatbot-widget.js" defer></script>
// before </body> on any page once the worker is deployed and the
// system prompt has been reviewed.
(function () {
  // Auto-detects environment by hostname so this same file works
  // correctly on both staging and production without needing an edit
  // (and possibly forgetting to revert it) at merge time. Defaults to
  // the staging Worker for anything that isn't explicitly the
  // production domain - covers staging.fieldnotesecurity.com once its
  // DNS is live, but also the interim hoongkiet-web.github.io/
  // fieldnote-security-staging/ fallback URL and local testing.
  var PRODUCTION_HOSTS = ['fieldnotesecurity.com', 'www.fieldnotesecurity.com'];
  var ENDPOINT = PRODUCTION_HOSTS.indexOf(location.hostname) !== -1
    ? 'https://fieldnotesecurity.com/api/chat'
    : 'https://fieldnote-security-chatbot-staging.fieldnotesecurity.workers.dev';
  var STORAGE_KEY = 'fns_chat_history';
  var history = [];

  try {
    var saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) history = JSON.parse(saved);
  } catch (e) { /* sessionStorage unavailable, start fresh */ }

  var style = document.createElement('style');
  style.textContent = [
    '.fns-chat-btn{position:fixed;bottom:20px;right:20px;width:56px;height:56px;border-radius:50%;',
    'background:var(--accent);border:none;cursor:pointer;z-index:9998;display:flex;align-items:center;',
    'justify-content:center;box-shadow:0 4px 16px rgba(0,0,0,0.35);transition:transform .15s var(--ease-out);}',
    '.fns-chat-btn:hover{transform:scale(1.06);}',
    '.fns-chat-btn svg{width:24px;height:24px;}',
    '.fns-chat-panel{position:fixed;bottom:88px;right:20px;width:min(360px,calc(100vw - 40px));',
    'max-height:min(520px,calc(100vh - 140px));background:var(--bg-elevated);border:1px solid var(--border);',
    'border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,0.45);z-index:9999;display:none;flex-direction:column;',
    'font-family:var(--font-body);overflow:hidden;}',
    '.fns-chat-panel.open{display:flex;}',
    '.fns-chat-head{padding:14px 16px;border-bottom:1px solid var(--border-subtle);background:var(--bg-elevated);}',
    '.fns-chat-head h4{font-family:var(--font-display);font-size:0.95rem;color:var(--text-primary);margin-bottom:2px;}',
    '.fns-chat-head p{font-size:0.72rem;color:var(--text-muted);}',
    '.fns-chat-close{position:absolute;top:12px;right:12px;background:none;border:none;color:var(--text-secondary);',
    'cursor:pointer;font-size:1.1rem;line-height:1;}',
    '.fns-chat-body{flex:1;overflow-y:auto;padding:12px 16px;display:flex;flex-direction:column;gap:10px;}',
    '.fns-msg{max-width:85%;padding:8px 12px;border-radius:10px;font-size:0.86rem;line-height:1.5;}',
    '.fns-msg-user{align-self:flex-end;background:var(--accent-dim);border:1px solid var(--accent-border);color:var(--text-primary);}',
    '.fns-msg-bot{align-self:flex-start;background:var(--bg);border:1px solid var(--border-subtle);color:var(--text-primary);}',
    '.fns-msg-bot a{text-decoration:underline;}',
    '.fns-chat-form{display:flex;gap:8px;padding:12px 16px;border-top:1px solid var(--border-subtle);}',
    '.fns-chat-input{flex:1;background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text-primary);',
    'padding:8px 10px;font-size:0.85rem;font-family:var(--font-body);resize:none;}',
    '.fns-chat-input:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-dim);}',
    '.fns-chat-send{background:var(--accent);border:none;border-radius:8px;padding:0 14px;color:#04121f;',
    'font-weight:600;font-size:0.85rem;cursor:pointer;}',
    '.fns-chat-send:disabled{opacity:0.5;cursor:not-allowed;}',
    '.fns-chat-disclaimer{font-size:0.66rem;color:var(--text-faint);padding:0 16px 10px;}',
  ].join('');
  document.head.appendChild(style);

  var btn = document.createElement('button');
  btn.className = 'fns-chat-btn';
  btn.setAttribute('aria-label', 'Open chat assistant');
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="#04121f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>';

  var panel = document.createElement('div');
  panel.className = 'fns-chat-panel';
  panel.innerHTML =
    '<div class="fns-chat-head">' +
      '<h4>Fieldnote Security assistant</h4>' +
      '<p>AI assistant for general questions - contact us for a full assessment.</p>' +
      '<button class="fns-chat-close" aria-label="Close chat">&times;</button>' +
    '</div>' +
    '<div class="fns-chat-body" id="fnsChatBody"></div>' +
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
    setChatBackgroundInert(true);
    input.focus();
  }

  function closePanel() {
    panel.classList.remove('open');
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

  function renderMessage(role, text) {
    var el = document.createElement('div');
    el.className = 'fns-msg ' + (role === 'user' ? 'fns-msg-user' : 'fns-msg-bot');
    el.textContent = text;
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

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text) return;

    renderMessage('user', text);
    history.push({ role: 'user', content: text });
    persist();
    input.value = '';
    input.disabled = true;
    sendBtn.disabled = true;

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history: history.slice(0, -1) }),
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var reply = data.reply || data.error || 'Something went wrong - please try again.';
        renderMessage('assistant', reply);
        history.push({ role: 'assistant', content: reply });
        persist();
      })
      .catch(function () {
        renderMessage('assistant', "Something went wrong - please try again, or email contact@fieldnotesecurity.com.");
      })
      .finally(function () {
        input.disabled = false;
        sendBtn.disabled = false;
        input.focus();
      });
  });
})();
