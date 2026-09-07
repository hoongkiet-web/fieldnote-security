// FS-60: shared re-entry guard for submit handlers. contact-form.js and
// auth-form.js both set submitBtn.disabled = true as a side effect but never
// checked it (or any flag) before proceeding, so a synchronous double-dispatch
// of the submit event fired two Formspree POSTs. chatbot-widget.js had the
// same disable-on-submit shape and was only accidentally immune, because it
// happens to read input.value at the top of the handler before clearing it -
// fragile, not a real guard, and would silently break under a plausible
// future change (e.g. delaying when the input is cleared).
//
// This wraps a handler so its "busy" flag is checked-and-set synchronously as
// the very first statement, before any other side effect or async work runs -
// a second synchronous dispatch is skipped entirely, not just its network
// call. The wrapped handler stays busy until the promise it returns settles
// (success or failure); if it returns nothing (e.g. an early validation
// return, or the chatbot's empty-message return), the guard releases
// immediately, since no async work was started.
//
// Loaded before every other page script (see the <script defer> ordering in
// each HTML page) so window.__fnsGuardAgainstReentry exists before any
// consumer's own top-level IIFE runs.
(function () {
  window.__fnsGuardAgainstReentry = function (handler) {
    var busy = false;
    return function () {
      if (busy) return;
      busy = true;
      var release = function () { busy = false; };
      var result;
      try {
        result = handler.apply(this, arguments);
      } catch (err) {
        release();
        throw err;
      }
      if (result && typeof result.then === 'function') {
        result.then(release, release);
      } else {
        release();
      }
      return result;
    };
  };
})();
