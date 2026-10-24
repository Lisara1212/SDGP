/* =====================================================
   AuraBlend - script.js
   Small vanilla JavaScript for the front end.
   No libraries needed. Backend (Spring Boot) comes later.
   ===================================================== */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var STORE_KEY = 'aurablend_shades';

  function loadShades() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch (e) { return []; }
  }
  function saveShades(list) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(list)); } catch (e) { /* storage blocked: ignore */ }
  }
  function toHex(r, g, b) {
    return '#' + [r, g, b].map(function (v) { return Number(v).toString(16).padStart(2, '0'); }).join('').toUpperCase();
  }
  function hexToRgb(hex) {
    var h = hex.replace('#', '');
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
  }
  function isHex(v) { return /^[0-9a-fA-F]{6}$/.test(v || ''); }

  /* ---------- Smooth scrolling for in-page anchors ---------- */
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href').slice(1);
      var target = id ? document.getElementById(id) : document.body;
      if (!target) return;
      e.preventDefault();
      var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    });
  });

  /* ---------- Show / hide password ---------- */
  $$('[data-toggle-password]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var input = document.getElementById(btn.getAttribute('data-toggle-password'));
      if (!input) return;
      var show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.setAttribute('aria-pressed', String(show));
      btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    });
  });

  /* ---------- Sign up and log in (front-end demo only) ---------- */
  function showError(form, message) {
    var box = $('.form-error', form);
    if (!box) return;
    box.textContent = message;
    box.hidden = false;
  }

  var signup = $('#signup-form');
  if (signup) {
    signup.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = $('#name', signup).value.trim();
      var email = $('#email', signup).value.trim();
      var pass = $('#password', signup).value;
      if (!name) return showError(signup, 'Please enter your name.');
      if (!/^\S+@\S+\.\S+$/.test(email)) return showError(signup, 'Please enter a valid email address.');
      if (pass.length < 8) return showError(signup, 'Your password needs at least 8 characters.');
      if (!$('#terms', signup).checked) return showError(signup, 'Please accept the Terms of Service and Privacy Policy.');
      window.location.href = 'index.html';
    });
  }

  var login = $('#login-form');
  if (login) {
    login.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = $('#email', login).value.trim();
      var pass = $('#password', login).value;
      if (!/^\S+@\S+\.\S+$/.test(email)) return showError(login, 'Please enter a valid email address.');
      if (!pass) return showError(login, 'Please enter your password.');
      window.location.href = 'index.html';
    });
  }

  /* ---------- Create shade ---------- */
  var creator = $('[data-creator]');
  if (creator) {
    var red = $('#red'), green = $('#green'), blue = $('#blue');
    var finishName = 'Matte';

    function updateCreator() {
      var hex = toHex(red.value, green.value, blue.value);
      creator.style.setProperty('--shade', hex);
      $('#red-out').textContent = red.value;
      $('#green-out').textContent = green.value;
      $('#blue-out').textContent = blue.value;
      $('#hex-out').textContent = hex;
      $('#rgb-out').textContent = 'RGB ' + red.value + ', ' + green.value + ', ' + blue.value + ' · ' + finishName;
      var tryLink = $('#try-link');
      var sendLink = $('#send-link');
      var plain = hex.slice(1);
      if (tryLink) tryLink.href = 'tryon.html?hex=' + plain;
      if (sendLink) sendLink.href = 'machine.html';
    }

    // Pre-fill from the URL, e.g. create.html?hex=C7566B&name=Rose%20Dream
    var params = new URLSearchParams(window.location.search);
    if (isHex(params.get('hex'))) {
      var rgb = hexToRgb(params.get('hex'));
      red.value = rgb.r; green.value = rgb.g; blue.value = rgb.b;
    }
    if (params.get('name')) $('#shade-name').value = params.get('name');

    [red, green, blue].forEach(function (s) { s.addEventListener('input', updateCreator); });

    $$('[data-finish]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        $$('[data-finish]').forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
        finishName = chip.getAttribute('data-finish');
        updateCreator();
      });
    });

    $('#save-shade').addEventListener('click', function () {
      var name = $('#shade-name').value.trim() || 'My shade';
      var list = loadShades();
      list.unshift({ name: name, hex: toHex(red.value, green.value, blue.value), finish: finishName });
      saveShades(list);
      window.location.href = 'collection.html';
    });

    updateCreator();
  }

  /* ---------- AI ideas: filter chips + suggest ---------- */
  var ideaList = $('#idea-list');
  if (ideaList) {
    var chips = $$('[data-tag]');
    var ideas = $$('.idea', ideaList);
    var status = $('#idea-status');

    function applyIdeaFilter() {
      var active = chips.filter(function (c) { return c.getAttribute('aria-pressed') === 'true'; })
        .map(function (c) { return c.getAttribute('data-tag'); });
      var shown = 0;
      ideas.forEach(function (card) {
        var tags = card.getAttribute('data-tags').split(' ');
        var match = active.every(function (t) { return tags.indexOf(t) !== -1; });
        card.hidden = !match;
        if (match) shown += 1;
      });
      if (status) status.textContent = shown ? 'Showing ' + shown + ' idea' + (shown === 1 ? '' : 's') + '.' : 'No ideas match all of these. Try removing a filter.';
    }

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        chip.setAttribute('aria-pressed', String(chip.getAttribute('aria-pressed') !== 'true'));
        applyIdeaFilter();
      });
    });

    $('#suggest-btn').addEventListener('click', function () {
      var text = ($('#prompt').value || '').toLowerCase();
      chips.forEach(function (c) { c.setAttribute('aria-pressed', String(text.indexOf(c.getAttribute('data-tag')) !== -1)); });
      applyIdeaFilter();
    });

    applyIdeaFilter();
  }

  /* ---------- Collection: saved shades + filters ---------- */
  var grid = $('#shade-grid');
  if (grid) {
    loadShades().forEach(function (s) {
      var card = document.createElement('article');
      card.className = 'shade-card';
      card.setAttribute('data-tags', 'saved');
      card.innerHTML =
        '<div class="shade-card__color" style="--c:' + s.hex + '"></div>' +
        '<div class="shade-card__body"><div class="shade-card__name"></div>' +
        '<div class="meta"></div><div class="badge badge--plain">Saved by you</div></div>';
      $('.shade-card__name', card).textContent = s.name;
      $('.meta', card).textContent = s.hex + ' · ' + s.finish;
      grid.insertBefore(card, grid.firstChild);
    });

    var filters = $$('[data-filter]');
    var count = $('#shade-count');

    function applyFilter(kind) {
      var cards = $$('.shade-card', grid);
      var shown = 0;
      cards.forEach(function (card) {
        var ok = kind === 'all' || card.getAttribute('data-tags').split(' ').indexOf(kind) !== -1;
        card.hidden = !ok;
        if (ok) shown += 1;
      });
      if (count) count.textContent = shown + (shown === 1 ? ' shade' : ' shades');
    }

    filters.forEach(function (chip) {
      chip.addEventListener('click', function () {
        filters.forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
        applyFilter(chip.getAttribute('data-filter'));
      });
    });

    applyFilter('all');
  }

  /* ---------- Virtual try-on ---------- */
  var stage = $('[data-tryon]');
  if (stage) {
    var strength = $('#strength');
    var shadeName = $('#shade-name-out');

    function setShade(hex, name) {
      stage.style.setProperty('--shade', hex);
      if (shadeName) shadeName.textContent = name + ' · ' + hex;
    }

    $$('[data-shade]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        $$('[data-shade]').forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
        setShade(btn.getAttribute('data-shade'), btn.getAttribute('data-name'));
      });
    });

    strength.addEventListener('input', function () {
      stage.style.setProperty('--strength', strength.value / 100);
      $('#strength-out').textContent = strength.value + '%';
    });

    var fileInput = $('#photo-input');
    $('#upload-btn').addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;
      var url = URL.createObjectURL(file);
      var face = $('#face');
      var photo = $('#photo');
      photo.src = url;
      photo.hidden = false;
      face.hidden = true;
      $('#stage-caption').textContent = 'Photo preview. Lip colouring on photos needs face detection (planned for a later sprint).';
    });

    var params2 = new URLSearchParams(window.location.search);
    if (isHex(params2.get('hex'))) setShade('#' + params2.get('hex').toUpperCase(), 'Your shade');
  }

  /* ---------- Machine setup: auto-continue from "connecting" ---------- */
  var redirect = document.body.getAttribute('data-redirect');
  if (redirect) {
    var delay = Number(document.body.getAttribute('data-delay')) || 4000;
    window.setTimeout(function () { window.location.href = redirect; }, delay);
  }

  /* ---------- Machine status: demo job progress ---------- */
  var jobBar = $('#job-bar');
  if (jobBar) {
    var pct = 62;
    var startBtn = $('#start-btn');
    var busy = $('#busy-alert');
    var jobTitle = $('#job-title');
    var jobStep = $('#job-step');
    var jobPct = $('#job-pct');
    var jobName = 'Berry Kiss';
    var timer = null;

    function render() {
      jobBar.style.setProperty('--p', pct + '%');
      jobPct.textContent = pct >= 100 ? 'Done' : 'Mixing ' + pct + '%';
      jobStep.textContent = pct >= 100 ? 'Step 3 of 3' : 'Step 2 of 3';
    }

    function finish() {
      window.clearInterval(timer);
      busy.hidden = true;
      jobTitle.textContent = 'Last job: ' + jobName + ' (done)';
      startBtn.disabled = false;
      startBtn.removeAttribute('aria-disabled');
    }

    function run(name, from) {
      jobName = name;
      pct = from;
      busy.hidden = false;
      $('#busy-text').textContent = name + ' is mixing. Wait for this job to finish before starting another.';
      jobTitle.textContent = 'Active job: ' + name;
      startBtn.disabled = true;
      startBtn.setAttribute('aria-disabled', 'true');
      render();
      timer = window.setInterval(function () {
        pct = Math.min(100, pct + 4);
        render();
        if (pct >= 100) finish();
      }, 400);
    }

    startBtn.addEventListener('click', function () { run('Rose Dream', 0); });
    run('Berry Kiss', 62);
  }
})();
