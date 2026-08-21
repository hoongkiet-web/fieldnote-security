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
        throw new Error('Formspree responded with an error');
      }
    }).catch(function () {
      submitBtn.disabled = false;
      submitBtn.removeAttribute('aria-busy');
      submitBtn.textContent = 'Submit authorization';
      status.textContent = 'Something went wrong sending this - please try again, or email contact@fieldnotesecurity.com directly.';
    });
  });
})();
