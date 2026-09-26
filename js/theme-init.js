// FS-148: loaded synchronously in <head>, before css/styles.css, so a saved
// theme choice is on <html data-theme> before first paint - no flash of the
// wrong theme. External file, not inline, because the CSP script-src only
// allows 'self' (plus Cloudflare's nonce and the JSON-LD hashes).
// No saved choice: do nothing, the CSS prefers-color-scheme default applies.
// Also marks <html> so the header toggle (useless without JS) only renders
// when scripts run, without a late pop-in from the deferred main.js.
(function () {
  var root = document.documentElement;
  root.classList.add('has-theme-js');
  try {
    var saved = localStorage.getItem('fns_theme');
    if (saved === 'light' || saved === 'dark') root.setAttribute('data-theme', saved);
  } catch (e) { /* storage blocked (private mode / policy): fall back to the OS preference */ }
})();
