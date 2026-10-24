(function () {
  var form = document.getElementById('contactForm');
  var submitBtn = document.getElementById('submitBtn');
  var status = document.getElementById('formStatus');
  var card = document.getElementById('formCard');

  if (!form) return;

  // FS-110: fire-and-forget business-outcome alert. Same env-detection
  // pattern as chatbot-widget.js's ENDPOINT. Chosen by hostname only -
  // deliberately no override (query param, global, attribute or storage).
  // FS-170 chunk 3: every non-production host (staging, localhost and
  // 127.0.0.1 as before FS-163, anything else) uses the same-origin relative
  // /api/monitor. On staging that is the staging monitor's zone route, behind
  // the Cloudflare Access app; locally it never leaves the machine.
  var MONITOR_PRODUCTION_HOSTS = ['fieldnotesecurity.com', 'www.fieldnotesecurity.com'];
  var MONITOR_ENDPOINT = MONITOR_PRODUCTION_HOSTS.indexOf(location.hostname) !== -1
    ? 'https://fieldnotesecurity.com/api/monitor'
    : '/api/monitor';
  function reportFailure(reason) {
    // Never lets a monitoring-call failure affect the user-facing error
    // path below it - this is purely "let Kiet know," not part of the
    // form's own success/failure handling.
    // FS-163: keepalive so the request survives the visitor leaving the
    // page; text/plain is a CORS-safelisted type, so no preflight is sent
    // (monitoring-worker parses the body as JSON whatever the type).
    try {
      fetch(MONITOR_ENDPOINT, {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ source: 'contact-form', reason: reason }),
      }).catch(function () {});
    } catch (e) { /* fetch not available or blocked - nothing more to do */ }
  }

  // Pre-select service checkboxes from ?service=slug params, e.g. a
  // pricing.html tier CTA linking to contact.html?service=vuln or
  // contact.html?service=dns-health&service=email-security
  var SERVICE_SLUG_TO_VALUE = {
    'vuln': 'Vulnerability Assessment',
    'dns-health': 'Domain & DNS Health Checker',
    'email-security': 'Email Security Checker',
    'script-audit': 'Third-Party Script Audit',
    'gdpr': 'GDPR Compliance Checker',
    'accessibility': 'Accessibility Checker'
  };
  var params = new URLSearchParams(window.location.search);
  params.getAll('service').forEach(function (slug) {
    var value = SERVICE_SLUG_TO_VALUE[slug];
    if (!value) return;
    var checkbox = form.querySelector('input[name="service"][value="' + value + '"]');
    if (checkbox) checkbox.checked = true;
  });

  form.addEventListener('submit', window.__fnsGuardAgainstReentry(function (e) {
    e.preventDefault();

    if (!form.reportValidity()) return;

    var servicesChecked = form.querySelectorAll('input[name="service"]:checked');
    if (servicesChecked.length === 0) {
      status.textContent = 'Please select at least one service.';
      // The services fieldset is described by #formStatus, so focusing its first box reads the error.
      var firstService = form.querySelector('input[name="service"]');
      if (firstService) firstService.focus();
      return;
    }

    status.textContent = '';
    submitBtn.disabled = true;
    submitBtn.setAttribute('aria-busy', 'true');
    submitBtn.textContent = 'Sending…';

    return fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
      headers: { 'Accept': 'application/json' }
    }).then(function (response) {
      if (response.ok) {
        // The form (and the focused button) is replaced, so move focus to the message
        // itself; role=status also announces it where focus is not followed.
        card.innerHTML =
          '<div class="form-success" role="status" tabindex="-1">' +
          '<h3>Thanks - your request is in.</h3>' +
          '<p>I\'ll take a look and get back to you at the email you provided.</p>' +
          '</div>';
        var success = card.querySelector('.form-success');
        if (success) success.focus();
      } else {
        // Distinguishes "reached Formspree, got rejected" (the FS-58/59
        // dead-endpoint failure mode) from a network-level failure below.
        throw new Error('formspree-status-' + response.status);
      }
    }).catch(function (err) {
      // FS-163: alert first, so it is already in flight before the error UI.
      reportFailure(err && err.message ? err.message : 'network-error');
      submitBtn.disabled = false;
      submitBtn.removeAttribute('aria-busy');
      submitBtn.textContent = 'Send request';
      status.textContent = 'Something went wrong sending this - please try again, or email contact@fieldnotesecurity.com directly.';
    });
  }));
})();
