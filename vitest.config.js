import { defineConfig } from 'vitest/config';

// FS-139: deliberately narrower than FS-74's full standard (see TESTING.md).
// This covers one specific, previously-untested gap in chatbot-widget.js
// (the reply-extraction fallback chain), not the whole website repo's JS -
// no 60% coverage gate is set here, since most of js/*.js (main.js,
// form-guard.js, contact-form.js, auth-form.js) has zero unit tests and
// isn't in scope. Extending real coverage enforcement to this repo remains
// the "stays scoped to the scanner repo only, for now" decision from FS-74.
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.js', 'tests/integration/**/*.test.js'],
  },
});
