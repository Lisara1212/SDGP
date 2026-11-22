/* AuraBlend landing page: shade carousel hero, split-text headline, scroll reveals. */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };

  /* ---------- scroll reveal ---------- */
  function initReveal() {
    var els = [].slice.call(document.querySelectorAll('.rise'));
    if (reduce || !('IntersectionObserver' in window)) return;
    document.documentElement.classList.add('reveal-ready');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- split headline ---------- */
  function initSplit() {
    var h = $('[data-split]'); if (!h || reduce) return;
    var text = h.textContent; h.setAttribute('aria-label', text); h.textContent = '';
    var n = 0;
    text.split(' ').forEach(function (word, wi, arr) {
      var w = document.createElement('span'); w.className = 'sw'; w.setAttribute('aria-hidden', 'true');
      word.split('').forEach(function (ch) {
        var c = document.createElement('span'); c.className = 'sc'; c.textContent = ch;
        c.style.animationDelay = (0.25 + n * 0.035) + 's'; n++; w.appendChild(c);
      });
      h.appendChild(w); if (wi < arr.length - 1) h.appendChild(document.createTextNode(' '));
    });
  }

  /* ---------- shade carousel ---------- */
  function initCarousel() {
    var kh = $('.kh'), arc = $('#kh-arc'), shades = window.AB_SIGNATURE;
    if (!kh || !arc || !shades || !shades.length) return;
    var N = shades.length, cur = 0, tiles = [], timer = null, interacted = false;
    var LIPS = '<svg viewBox="0 0 64 40" aria-hidden="true"><path d="M4 20C14 8 24 8 32 14c8-6 18-6 28 6-10 14-20 16-28 16S14 34 4 20z" fill="currentColor"/><path d="M4 20c16 4 40 4 56 0" stroke="rgba(0,0,0,.28)" fill="none" stroke-width="1.6"/><ellipse cx="22" cy="17" rx="7" ry="2.2" fill="rgba(255,255,255,.35)"/></svg>';
    shades.forEach(function (s, i) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'kh__tile';
      b.style.setProperty('--c', s.hex); b.innerHTML = LIPS;
      b.setAttribute('aria-label', 'Choose ' + s.name);
      b.addEventListener('click', function () { interact(); go(i); });
      arc.appendChild(b); tiles.push(b);
    });
    function layout() {
      var W = arc.clientWidth || 900, R = W * 0.62, step = W < 700 ? 0.34 : 0.30;
      tiles.forEach(function (t, i) {
        var k = ((i - cur) % N + N) % N; if (k > N / 2) k -= N;
        var ak = Math.abs(k), a = k * step;
        var x = Math.sin(a) * R, y = (1 - Math.cos(a)) * R * 0.9;
        var vis = ak <= 3 ? 1 : 0, sc = ak === 0 ? 0.55 : 1 - ak * 0.05;
        t.style.transform = 'translate(-50%,-50%) translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) rotate(' + (k * 13) + 'deg) scale(' + sc + ')';
        t.style.opacity = ak === 0 ? 0 : vis; t.style.pointerEvents = vis && ak !== 0 ? 'auto' : 'none';
        t.style.zIndex = 10 - ak; t.tabIndex = ak === 0 ? -1 : 0;
        t.setAttribute('aria-pressed', ak === 0 ? 'true' : 'false');
      });
    }
    function paint() {
      var s = shades[cur];
      kh.style.setProperty('--shade', s.hex);
      $('#stage-name').textContent = s.name; $('#stage-hex').textContent = s.hex;
      var a = $('#kh-custom'); if (a && window.AB_studioUrl) a.href = window.AB_studioUrl(s);
    }
    function go(n) { cur = ((n % N) + N) % N; layout(); paint(); }
    function interact() { interacted = true; if (timer) { clearInterval(timer); timer = null; } }
    $('#kh-next').addEventListener('click', function () { interact(); go(cur + 1); });
    $('#kh-prev').addEventListener('click', function () { interact(); go(cur - 1); });
    kh.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { interact(); go(cur + 1); } else if (e.key === 'ArrowLeft') { interact(); go(cur - 1); }
    });
    /* drag / swipe */
    var sx = null;
    arc.addEventListener('pointerdown', function (e) { sx = e.clientX; });
    window.addEventListener('pointerup', function (e) {
      if (sx === null) return; var dx = e.clientX - sx; sx = null;
      if (Math.abs(dx) > 40) { interact(); go(cur + (dx < 0 ? 1 : -1)); }
    });
    kh.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 18) { e.preventDefault(); interact(); go(cur + (e.deltaX > 0 ? 1 : -1)); }
    }, { passive: false });
    window.addEventListener('resize', layout);
    go(0);
    if (!reduce) timer = setInterval(function () { if (!interacted && !document.hidden) go(cur + 1); }, 3600);
    /* gentle parallax on scroll */
    if (!reduce) {
      var lip = $('.kh__lip'), ped = $('.kh__pedestal'), ticking = false;
      window.addEventListener('scroll', function () {
        if (ticking) return; ticking = true;
        requestAnimationFrame(function () {
          var y = Math.min(window.scrollY, 700);
          lip.style.setProperty('--py', (y * 0.12).toFixed(1) + 'px');
          arc.style.setProperty('--py', (y * -0.05).toFixed(1) + 'px');
          ticking = false;
        });
      }, { passive: true });
    }
  }

  initSplit(); initReveal(); initCarousel();
})();
