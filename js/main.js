// FS-131-verify-4486150874b3: trivial marker comment, added solely to give
// the FS-131 cache-purge fix's end-to-end verification a byte-level way to
// confirm staging serves fresh content post-deploy while production
// (main.js on fieldnotesecurity.com) stays untouched. Safe to remove once
// FS-131 is closed.
(function () {
  var menuBtn = document.getElementById('menuBtn');
  var navLinks = document.querySelector('.nav-links');
  // FS-50: background content the open mobile menu overlays. `main`/`footer`
  // are looked up by tag, not id, so this works on every page without
  // requiring markup changes beyond the nav/button wiring itself.
  var backgroundEls = [document.querySelector('main'), document.querySelector('footer')];

  // FS-50: `inert` on the background while the menu is open removes it from
  // both the tab order and the accessibility tree natively - no hand-rolled
  // focus trap needed. Progressive enhancement: browsers that don't
  // understand `inert` (a small remaining slice, ~95%+ global support as of
  // this fix) just ignore the attribute, so this never breaks anything, it
  // only fails to help on those browsers.
  function setBackgroundInert(isInert) {
    backgroundEls.forEach(function (el) {
      if (el) el.toggleAttribute('inert', isInert);
    });
  }

  // FS-133: named open/close functions (was inline toggle logic) so the
  // chat widget has a stable pair of hooks to coordinate with - see
  // window.__fnsMobileMenu below. Behavior is otherwise unchanged from the
  // FS-50 fix: aria-expanded, inert toggle, and focus movement are the same,
  // just restructured out of one toggle-based handler into two named ones.
  function openMenu() {
    // FS-133: mutual exclusion with the chat panel - both this menu and the
    // chat panel independently inert the same background (main/footer) while
    // open, so at most one can be "open + trapping" at a time. Closing the
    // other one first (via its own close(), which cleanly removes its own
    // inert state) rather than reference-counting keeps each widget's inert
    // logic simple and independently correct - see technical-documentation.md
    // FS-133 entry for why reference-counting was considered and rejected.
    if (window.__fnsChatPanel && window.__fnsChatPanel.isOpen && window.__fnsChatPanel.isOpen()) {
      window.__fnsChatPanel.close();
    }
    navLinks.classList.add('mobile-open');
    menuBtn.setAttribute('aria-expanded', 'true');
    setBackgroundInert(true);
    // FS-50: move focus into the menu on open - without this, Tab
    // continues into whatever comes next in DOM order (now inert, but
    // focus still needs an explicit starting point inside the menu).
    var firstLink = navLinks.querySelector('a');
    if (firstLink) firstLink.focus();
  }

  function closeMenu() {
    navLinks.classList.remove('mobile-open');
    menuBtn.setAttribute('aria-expanded', 'false');
    setBackgroundInert(false);
    // FS-50: explicit, not incidental - stays correct even if a future
    // change adds another way to close the menu (Escape, outside click).
    menuBtn.focus();
  }

  if (menuBtn && navLinks) {
    menuBtn.addEventListener('click', function () {
      if (navLinks.classList.contains('mobile-open')) closeMenu();
      else openMenu();
    });

    // FS-133: exposed so chatbot-widget.js can close this menu before
    // opening the chat panel (mutual exclusion - see openMenu() above).
    // Both scripts load via <script defer>, executing in document order
    // before any user interaction is possible, so this is always defined
    // by the time either widget's click handler can actually fire,
    // regardless of the two scripts' relative tag order.
    window.__fnsMobileMenu = {
      close: closeMenu,
      isOpen: function () { return navLinks.classList.contains('mobile-open'); },
    };
  }

  if (!('IntersectionObserver' in window)) return;
  document.documentElement.classList.add('js-ready');

  var els = document.querySelectorAll('.reveal');
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2, rootMargin: '0px 0px -40px 0px' });
  els.forEach(function (el) { io.observe(el); });
})();
