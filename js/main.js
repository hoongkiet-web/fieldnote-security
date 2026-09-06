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

  if (menuBtn && navLinks) {
    menuBtn.addEventListener('click', function () {
      var open = navLinks.classList.toggle('mobile-open');
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      setBackgroundInert(open);
      if (open) {
        // FS-50: move focus into the menu on open - without this, Tab
        // continues into whatever comes next in DOM order (now inert, but
        // focus still needs an explicit starting point inside the menu).
        var firstLink = navLinks.querySelector('a');
        if (firstLink) firstLink.focus();
      } else {
        // FS-50: explicit, not incidental - stays correct even if a future
        // change adds another way to close the menu (Escape, outside click).
        menuBtn.focus();
      }
    });
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
