(function () {
  var isCoarse = window.matchMedia('(hover: none), (pointer: coarse)').matches;

  document.querySelectorAll('.nav-dropdown-wrap').forEach(function (wrap) {
    var trigger = wrap.querySelector('#nav-route-trigger, .nav-link');
    if (!trigger) return;

    // Desktop with hover: CSS handles the panel; keep Escape to close
    if (!isCoarse) {
      trigger.addEventListener('focus', function () {
        wrap.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
      });
      wrap.addEventListener('mouseleave', function () {
        wrap.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
      });
      return;
    }

    // Touch / coarse pointer: tap toggles the panel (don't navigate on first tap)
    trigger.addEventListener('click', function (e) {
      var open = !wrap.classList.contains('is-open');
      document.querySelectorAll('.nav-dropdown-wrap.is-open').forEach(function (w) {
        if (w === wrap) return;
        w.classList.remove('is-open');
        var t = w.querySelector('#nav-route-trigger, .nav-link');
        if (t) t.setAttribute('aria-expanded', 'false');
      });
      if (open) {
        e.preventDefault();
        wrap.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
      } else {
        wrap.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
      }
    });
  });

  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('.nav-dropdown-wrap')) return;
    document.querySelectorAll('.nav-dropdown-wrap.is-open').forEach(function (wrap) {
      wrap.classList.remove('is-open');
      var t = wrap.querySelector('#nav-route-trigger, .nav-link');
      if (t) t.setAttribute('aria-expanded', 'false');
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.nav-dropdown-wrap.is-open').forEach(function (wrap) {
      wrap.classList.remove('is-open');
      var t = wrap.querySelector('#nav-route-trigger, .nav-link');
      if (t) {
        t.setAttribute('aria-expanded', 'false');
        t.focus();
      }
    });
  });
})();
