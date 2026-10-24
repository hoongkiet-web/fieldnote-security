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

    // Escape closes the open mobile menu; closeMenu() returns focus to #menuBtn.
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && navLinks.classList.contains('mobile-open')) closeMenu();
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

  // FS-91: Services dropdown, desktop-only (>=1280px). a11y F13: "Services"
  // (#servicesLink) is a plain link to services.html at every width, with no
  // handler; the separate #servicesToggle button opens the menu. The button is
  // display:none below 1280px, so openMenu()'s `navLinks.querySelector('a')`
  // above still focuses the Services link first on mobile.
  var servicesToggle = document.getElementById('servicesToggle');
  var servicesLink = document.getElementById('servicesLink');
  var servicesMenu = document.getElementById('servicesMenu');

  if (servicesToggle && servicesMenu) {
    var desktopMql = window.matchMedia('(min-width: 1280px)');

    function isDesktopDropdown() { return desktopMql.matches; }
    function isDropdownOpen() { return servicesMenu.classList.contains('open'); }

    function openServicesDropdown() {
      servicesMenu.classList.add('open');
      servicesToggle.setAttribute('aria-expanded', 'true');
      // Same convention as openMenu()/openPanel() elsewhere in this
      // codebase: focus moves to the first item inside on open.
      var firstItem = servicesMenu.querySelector('a');
      if (firstItem) firstItem.focus();
    }

    function closeServicesDropdown(returnFocusToToggle) {
      servicesMenu.classList.remove('open');
      servicesToggle.setAttribute('aria-expanded', 'false');
      if (returnFocusToToggle) servicesToggle.focus();
    }

    // The button is hidden below 1280px, so the width check only guards a
    // click arriving mid-resize.
    servicesToggle.addEventListener('click', function () {
      if (!isDesktopDropdown()) return;
      if (isDropdownOpen()) closeServicesDropdown(false);
      else openServicesDropdown();
    });

    document.addEventListener('keydown', function (e) {
      if (!isDesktopDropdown() || !isDropdownOpen()) return;
      if (e.key === 'Escape') closeServicesDropdown(true);
    });

    // Click-outside-closes. No Tab-trap here (deliberately, per review
    // checkpoint - a nav dropdown trapping Tab would be non-standard and
    // surprise keyboard users); items stay naturally Tab-reachable in DOM
    // order while the menu is open, same as focusout below closing it once
    // Tab carries focus past the last item.
    document.addEventListener('click', function (e) {
      if (!isDesktopDropdown() || !isDropdownOpen()) return;
      if (!servicesToggle.contains(e.target) && !servicesMenu.contains(e.target)) {
        closeServicesDropdown(false);
      }
    });

    // Not explicitly required by the ticket, added for correctness: without
    // this, tabbing straight through an open dropdown into the rest of the
    // nav would leave it visually stuck open. Deferred one frame so the
    // browser has already moved focus to its real destination before this
    // checks where focus landed.
    document.addEventListener('focusout', function () {
      if (!isDesktopDropdown() || !isDropdownOpen()) return;
      window.requestAnimationFrame(function () {
        var active = document.activeElement;
        if (!servicesToggle.contains(active) && !servicesMenu.contains(active)) {
          closeServicesDropdown(false);
        }
      });
    });

    // ARIA lives in the markup on the button, which is display:none (out of
    // the accessibility tree) below 1280px; leaving desktop width just closes
    // the menu.
    function applyDropdownMode() {
      if (!isDesktopDropdown()) closeServicesDropdown(false);
    }
    applyDropdownMode();
    desktopMql.addEventListener('change', applyDropdownMode);

    // Highlights "Services" via a plain class (not aria-current itself,
    // which must stay on the one link that's actually the current page)
    // when the current page is one of the items inside the - possibly
    // closed - dropdown, so it doesn't visually disappear from the nav
    // just because it's collapsed by default.
    if (servicesLink && servicesMenu.querySelector('a[aria-current="page"]')) {
      servicesLink.classList.add('nav-dropdown-link-active');
    }
  }

  // FS-148: theme toggle. js/theme-init.js has already put any saved choice
  // (localStorage fns_theme) on <html data-theme> before first paint; with no
  // saved choice the CSS follows prefers-color-scheme. This handles the click,
  // saves the choice, and keeps aria-pressed ("light theme on") accurate.
  // Placed before the IntersectionObserver early return so it runs everywhere.
  var themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    var root = document.documentElement;
    var osLight = window.matchMedia('(prefers-color-scheme: light)');

    function currentTheme() {
      var t = root.getAttribute('data-theme');
      if (t === 'light' || t === 'dark') return t;
      return osLight.matches ? 'light' : 'dark';
    }
    function syncThemeToggle() {
      themeToggle.setAttribute('aria-pressed', currentTheme() === 'light' ? 'true' : 'false');
    }

    themeToggle.addEventListener('click', function () {
      var next = currentTheme() === 'light' ? 'dark' : 'light';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('fns_theme', next); } catch (e) { /* storage blocked: applies to this page view only */ }
      syncThemeToggle();
    });
    // No saved choice means the site follows the OS live - keep the button honest if it flips.
    osLight.addEventListener('change', syncThemeToggle);
    // A choice made in another tab applies here too.
    window.addEventListener('storage', function (e) {
      if (e.key === 'fns_theme' && (e.newValue === 'light' || e.newValue === 'dark')) {
        root.setAttribute('data-theme', e.newValue);
        syncThemeToggle();
      }
    });
    syncThemeToggle();
  }

  // No js-ready means .reveal content is simply visible: no observer support,
  // or the visitor asked for reduced motion (nothing to animate, so nothing to hide).
  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.documentElement.classList.add('js-ready');

  var els = document.querySelectorAll('.reveal');
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
    // Threshold 0: a block taller than a few viewports (e.g. at 400% zoom) can
    // never be 20% visible, so any visible pixel reveals it (WCAG 1.4.10).
  }, { threshold: 0, rootMargin: '0px' });
  els.forEach(function (el) { io.observe(el); });
})();
