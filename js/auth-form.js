(function () {
  var companyInput = document.getElementById('companyName');
  var companyEcho = document.getElementById('companyEcho');
  if (companyInput && companyEcho) {
    companyInput.addEventListener('input', function () {
      companyEcho.textContent = companyInput.value.trim() || '[company name]';
    });
  }

  var form = document.getElementById('authForm');
  var submitBtn = document.getElementById('submitBtn');
  var status = document.getElementById('formStatus');
  var card = document.getElementById('formCard');

  if (!form) return;

  // FS-110: fire-and-forget business-outcome alert - see contact-form.js
  // for the identical pattern/reasoning.
  var MONITOR_PRODUCTION_HOSTS = ['fieldnotesecurity.com', 'www.fieldnotesecurity.com'];
  var MONITOR_ENDPOINT = MONITOR_PRODUCTION_HOSTS.indexOf(location.hostname) !== -1
    ? 'https://fieldnotesecurity.com/api/monitor'
    : 'https://fieldnote-security-monitoring-staging.fieldnotesecurity.workers.dev';
  function reportFailure(reason) {
    try {
      fetch(MONITOR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'authorization-form', reason: reason }),
      }).catch(function () {});
    } catch (e) { /* fetch not available or blocked - nothing more to do */ }
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    if (!form.reportValidity()) return;

    var servicesChecked = form.querySelectorAll('input[name="service"]:checked');
    if (servicesChecked.length === 0) {
      status.textContent = 'Please select at least one authorized service.';
      return;
    }

    status.textContent = '';
    submitBtn.disabled = true;
    submitBtn.setAttribute('aria-busy', 'true');
    submitBtn.textContent = 'Submitting…';

    fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
      headers: { 'Accept': 'application/json' }
    }).then(function (response) {
      if (response.ok) {
        card.innerHTML =
          '<div class="form-success">' +
          '<h3>Authorization received.</h3>' +
          '<p>Thanks - I\'ll cross-check this against the domain(s) and services listed before the scan runs.</p>' +
          '</div>';
      } else {
        throw new Error('formspree-status-' + response.status);
      }
    }).catch(function (err) {
      submitBtn.disabled = false;
      submitBtn.removeAttribute('aria-busy');
      submitBtn.textContent = 'Submit authorization';
      status.textContent = 'Something went wrong sending this - please try again, or email contact@fieldnotesecurity.com directly.';
      reportFailure(err && err.message ? err.message : 'network-error');
    });
  });
})();
