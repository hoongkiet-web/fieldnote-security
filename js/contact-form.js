(function () {
  var form = document.getElementById('contactForm');
  var submitBtn = document.getElementById('submitBtn');
  var status = document.getElementById('formStatus');
  var card = document.getElementById('formCard');

  if (!form) return;

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

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    if (!form.reportValidity()) return;

    var servicesChecked = form.querySelectorAll('input[name="service"]:checked');
    if (servicesChecked.length === 0) {
      status.textContent = 'Please select at least one service.';
      return;
    }

    status.textContent = '';
    submitBtn.disabled = true;
    submitBtn.setAttribute('aria-busy', 'true');
    submitBtn.textContent = 'Sending…';

    fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
      headers: { 'Accept': 'application/json' }
    }).then(function (response) {
      if (response.ok) {
        card.innerHTML =
          '<div class="form-success">' +
          '<h3>Thanks - your request is in.</h3>' +
          '<p>I\'ll take a look and get back to you at the email you provided.</p>' +
          '</div>';
      } else {
        throw new Error('Formspree responded with an error');
      }
    }).catch(function () {
      submitBtn.disabled = false;
      submitBtn.removeAttribute('aria-busy');
      submitBtn.textContent = 'Send request';
      status.textContent = 'Something went wrong sending this - please try again, or email contact@fieldnotesecurity.com directly.';
    });
  });
})();
