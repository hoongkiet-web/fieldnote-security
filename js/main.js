(function () {
  var menuBtn = document.getElementById('menuBtn');
  var navLinks = document.querySelector('.nav-links');
  if (menuBtn && navLinks) {
    menuBtn.addEventListener('click', function () {
      var open = navLinks.classList.toggle('mobile-open');
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
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
