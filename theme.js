/* AuraBlend theme switch: light (default) / dark. Remembered in this browser. */
(function () {
  var root = document.documentElement, KEY = 'aurablend-theme';
  function set(t) { if (t === 'dark') root.setAttribute('data-theme', 'dark'); else root.removeAttribute('data-theme'); }
  function get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  set(get() === 'dark' ? 'dark' : 'light');
  document.addEventListener('DOMContentLoaded', function () {
    var b = document.querySelector('.theme-toggle'); if (!b) return;
    function sync() { var d = root.getAttribute('data-theme') === 'dark'; b.setAttribute('aria-pressed', d); b.setAttribute('aria-label', d ? 'Switch to light mode' : 'Switch to dark mode'); }
    sync();
    b.addEventListener('click', function () {
      var d = root.getAttribute('data-theme') === 'dark'; set(d ? 'light' : 'dark');
      try { localStorage.setItem(KEY, d ? 'light' : 'dark'); } catch (e) {}
      sync();
    });
  });
})();
