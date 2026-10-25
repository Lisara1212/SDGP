/* =====================================================
   AuraBlend - app.js
   Shared logic for every page (vanilla JS, no libraries).
   Pages are chosen with <body data-page="...">.
   The back end (Spring Boot + MySQL, ESP32 over MQTT) comes later:
   places to swap in real calls are marked  // BACKEND:
   ===================================================== */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function hex2(n) { return clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0'); }
  function toHex(rgb) { return ('#' + hex2(rgb[0]) + hex2(rgb[1]) + hex2(rgb[2])).toUpperCase(); }
  function esc(n) { return Math.round(n); }

  /* ---------- Colour engine ----------
     Three pigments are blended by their share of the total, then the result is
     moved toward a nude base when the total pigment is low (a weaker mix). */
  var PIG = { pink: [228, 96, 140], red: [176, 21, 48], brown: [106, 53, 36] };
  var BASE = [235, 200, 190];

  function mix(p, r, b) {
    var total = p + r + b;
    if (total <= 0) return { hex: toHex(BASE), rgb: BASE, pct: { pink: 0, red: 0, brown: 0 }, total: 0 };
    var avg = [0, 1, 2].map(function (i) { return (PIG.pink[i] * p + PIG.red[i] * r + PIG.brown[i] * b) / total; });
    var strength = clamp(0.35 + total / 160, 0.35, 1);
    var rgb = avg.map(function (v, i) { return BASE[i] + (v - BASE[i]) * strength; });
    return {
      hex: toHex(rgb), rgb: rgb, total: total,
      pct: { pink: esc(p / total * 100), red: esc(r / total * 100), brown: esc(b / total * 100) }
    };
  }

  var NAMES = {
    red: ['Imperial Scarlet', 'Royal Crimson', 'Velvet Ruby', 'Bespoke Garnet'],
    pink: ['Satin Rose', 'Blush Petal', 'Peony Dream', 'Sunset Mauve'],
    brown: ['Warm Cocoa', 'Terracotta Nude', 'Spiced Mocha', 'Caramel Silk'],
    mix: ['Harmony Rosewood', 'Aura Custom Blend', 'Cashmere Berry', 'Velvet Mauve']
  };
  function shadeName(p, r, b) {
    var top = Math.max(p, r, b), total = p + r + b;
    var key = 'mix';
    if (total > 0 && top / total > 0.46) key = top === r ? 'red' : (top === p ? 'pink' : 'brown');
    var list = NAMES[key];
    return list[(p + r * 2 + b * 3) % list.length];
  }

  /* ---------- Lip drawing ---------- */
  function drawLips(canvas, hex, finish) {
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    var W = 360, H = 240, k = canvas.width / W;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.translate(W / 2, H / 2 + 6);
    ctx.scale(1.85, 1.85);

    // soft glow behind the lips
    var glow = ctx.createRadialGradient(0, 0, 10, 0, 0, 100);
    glow.addColorStop(0, hex + '55'); glow.addColorStop(1, hex + '00');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(0, 0, 100, 0, Math.PI * 2); ctx.fill();

    function upper() {
      ctx.beginPath();
      ctx.moveTo(-60, 0);
      ctx.bezierCurveTo(-35, -45, -15, -40, 0, -20);
      ctx.bezierCurveTo(15, -40, 35, -45, 60, 0);
      ctx.bezierCurveTo(35, -5, 15, -2, 0, -8);
      ctx.bezierCurveTo(-15, -2, -35, -5, -60, 0);
      ctx.closePath();
    }
    function lower() {
      ctx.beginPath();
      ctx.moveTo(-60, 0);
      ctx.bezierCurveTo(-35, 45, 35, 45, 60, 0);
      ctx.bezierCurveTo(35, 5, 15, 8, 0, -2);
      ctx.bezierCurveTo(-15, 8, -35, 5, -60, 0);
      ctx.closePath();
    }
    var g1 = ctx.createLinearGradient(0, -42, 0, 0);
    g1.addColorStop(0, shade(hex, -0.18)); g1.addColorStop(1, shade(hex, 0.04));
    var g2 = ctx.createLinearGradient(0, -4, 0, 40);
    g2.addColorStop(0, shade(hex, -0.06)); g2.addColorStop(0.55, shade(hex, 0.1)); g2.addColorStop(1, shade(hex, -0.12));
    ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
    ctx.fillStyle = g1; upper(); ctx.fill();
    ctx.fillStyle = g2; lower(); ctx.fill();
    ctx.shadowColor = 'transparent';

    // mouth line
    ctx.strokeStyle = shade(hex, -0.45); ctx.lineWidth = 1.4; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-60, 0);
    ctx.bezierCurveTo(-35, -5, -15, -2, 0, -8);
    ctx.bezierCurveTo(15, -2, 35, -5, 60, 0);
    ctx.stroke();

    // finish
    var alpha = finish === 'gloss' ? 0.6 : (finish === 'satin' ? 0.22 : 0);
    if (alpha) {
      ctx.fillStyle = 'rgba(255,255,255,' + alpha + ')';
      ctx.beginPath(); ctx.ellipse(-12, 17, 22, 5.5, -0.08, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(26, 12, 8, 2.6, -0.25, 0, Math.PI * 2); ctx.fill();
      if (finish === 'gloss') { ctx.beginPath(); ctx.ellipse(-24, -22, 10, 2.8, -0.35, 0, Math.PI * 2); ctx.fill(); }
    } else {
      ctx.fillStyle = 'rgba(20,10,15,.1)'; upper(); ctx.fill(); lower(); ctx.fill();
    }
    ctx.restore();
  }
  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16), c = [n >> 16 & 255, n >> 8 & 255, n & 255];
    c = c.map(function (v) { return amt >= 0 ? v + (255 - v) * amt : v * (1 + amt); });
    return toHex(c);
  }

  /* ---------- Storage (browser only for now) ---------- */
  // BACKEND: replace with GET/POST /api/shades once Spring Boot + MySQL exist.
  var SAVED = 'aurablend_saved_v2', LEVELS = 'aurablend_levels_v2', JOBS = 'aurablend_jobs_v2';
  function read(key, fallback) { try { var v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; } }
  function write(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; } }

  var toastTimer;
  function toast(msg) {
    var t = $('#toast');
    if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }

  var SIGNATURE = [
    { name: 'Royal Crimson', p: 0, r: 70, b: 30 },
    { name: 'Satin Rose', p: 60, r: 40, b: 0 },
    { name: 'Warm Cocoa', p: 0, r: 35, b: 65 },
    { name: 'Blush Mauve', p: 50, r: 50, b: 0 }
  ].map(function (s) { s.hex = mix(s.p, s.r, s.b).hex; return s; });

  function studioUrl(s) {
    return 'create.html?p=' + s.p + '&r=' + s.r + '&b=' + s.b + '&name=' + encodeURIComponent(s.name) + (s.f ? '&f=' + s.f : '');
  }
  function machineUrl(s) {
    return 'machine.html?p=' + s.p + '&r=' + s.r + '&b=' + s.b + '&name=' + encodeURIComponent(s.name);
  }
  function ratioText(s) {
    var m = mix(s.p, s.r, s.b).pct, out = [];
    if (m.pink) out.push('Pink ' + m.pink + '%');
    if (m.red) out.push('Red ' + m.red + '%');
    if (m.brown) out.push('Brown ' + m.brown + '%');
    return out.join(' / ');
  }
  function mixBar(host, p, r, b) {
    var m = mix(p, r, b).pct;
    host.innerHTML = '';
    [['pink', '#e4608c'], ['red', '#b01530'], ['brown', '#8a4a30']].forEach(function (x) {
      var s = el('span'); s.style.width = m[x[0]] + '%'; s.style.background = x[1]; host.appendChild(s);
    });
  }
  function param(name) { return new URLSearchParams(window.location.search).get(name); }
  function num(v, d) { var n = parseInt(v, 10); return isNaN(n) ? d : clamp(n, 0, 100); }

  /* ---------- Home ---------- */
  function initHome() {
    var row = $('#sig-row');
    SIGNATURE.forEach(function (s) {
      var a = el('a', 'shade-tile'); a.href = studioUrl(s); a.style.setProperty('--c', s.hex);
      a.setAttribute('aria-label', 'Open ' + s.name + ' in the studio');
      a.appendChild(el('div', 'shade-tile__color'));
      var body = el('div', 'shade-tile__body');
      body.appendChild(el('div', 'shade-tile__name', s.name));
      body.appendChild(el('div', 'shade-tile__meta', ratioText(s)));
      body.appendChild(el('span', 'shade-tile__hex', s.hex));
      a.appendChild(body); row.appendChild(a);
    });
    var stage = $('#stage'), label = $('#stage-name'), i = 0;
    function show(n) {
      var s = SIGNATURE[n % SIGNATURE.length];
      stage.style.setProperty('--shade', s.hex);
      label.textContent = s.name; $('#stage-hex').textContent = s.hex;
    }
    show(0);
    if (!reduceMotion) setInterval(function () { i += 1; show(i); }, 3200);
  }

  /* ---------- Create (analysis + studio) ---------- */
  function initCreate() {
    var sl = { p: $('#slider-pink'), r: $('#slider-red'), b: $('#slider-brown') };
    var nameInput = $('#shade-name'), finish = $('#finish-select'), canvas = $('#lipCanvas');
    var nameTouched = false;
    var DEFAULT = { p: 30, r: 70, b: 40 };

    function current() { return { p: +sl.p.value, r: +sl.r.value, b: +sl.b.value, f: finish.value, hex: '', name: nameInput.value.trim() }; }
    function update() {
      var c = current(), m = mix(c.p, c.r, c.b);
      $('#val-pink').textContent = c.p + '%'; $('#val-red').textContent = c.r + '%'; $('#val-brown').textContent = c.b + '%';
      $('#shade-hex').textContent = m.hex;
      document.documentElement.style.setProperty('--shade', m.hex);
      var auto = shadeName(c.p, c.r, c.b);
      $('#shade-title').textContent = nameInput.value.trim() || auto;
      if (!nameTouched) nameInput.placeholder = auto;
      mixBar($('#mix-bar'), c.p, c.r, c.b);
      var pc = m.pct;
      $('#mix-legend').innerHTML = '';
      [['Pink', pc.pink, '#e4608c'], ['Red', pc.red, '#b01530'], ['Brown', pc.brown, '#8a4a30']].forEach(function (x) {
        var s = el('span'); var d = el('i'); d.style.background = x[2]; s.appendChild(d); s.appendChild(document.createTextNode(x[0] + ' ' + x[1] + '%')); $('#mix-legend').appendChild(s);
      });
      drawLips(canvas, m.hex, finish.value);
    }
    function setValues(p, r, b) { sl.p.value = p; sl.r.value = r; sl.b.value = b; update(); }

    [sl.p, sl.r, sl.b].forEach(function (s) { s.addEventListener('input', update); });
    finish.addEventListener('change', update);
    nameInput.addEventListener('input', function () { nameTouched = !!nameInput.value.trim(); update(); });
    $('#reset-btn').addEventListener('click', function () { setValues(DEFAULT.p, DEFAULT.r, DEFAULT.b); nameInput.value = ''; nameTouched = false; update(); });

    function snapshot() {
      var c = current(), m = mix(c.p, c.r, c.b);
      return { id: String(Date.now()), name: c.name || shadeName(c.p, c.r, c.b), hex: m.hex, p: c.p, r: c.r, b: c.b, f: c.f, ts: Date.now() };
    }
    $('#save-btn').addEventListener('click', function () {
      var s = snapshot(), list = read(SAVED, []);
      list.unshift(s);
      if (write(SAVED, list)) toast('Saved "' + s.name + '" to your collection'); else toast('Could not save: browser storage is blocked');
    });
    $('#dispense-btn').addEventListener('click', function () { window.location.href = machineUrl(snapshot()); });

    // prefill from URL (e.g. Home tiles, Ideas, Saved)
    if (param('p') !== null || param('r') !== null || param('b') !== null) {
      setValues(num(param('p'), 0), num(param('r'), 0), num(param('b'), 0));
      if (param('name')) { nameInput.value = param('name'); nameTouched = true; }
      if (['satin', 'matte', 'gloss'].indexOf(param('f')) !== -1) finish.value = param('f');
    }
    update();

    /* ----- Image analysis ----- */
    var video = $('#webcam'), img = $('#upload-preview'), empty = $('#viewer-empty'), viewer = $('#viewer');
    var notice = $('#scan-notice'), stream = null, mode = 'cam', hasImage = false;
    function say(msg, isErr) { notice.textContent = msg; notice.hidden = !msg; notice.className = 'notice' + (isErr ? ' notice--err' : ''); }
    function stopCam() { if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; } }
    function setMode(m) {
      mode = m; hasImage = false; say('');
      $$('[data-mode]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-mode') === m)); });
      video.hidden = true; img.hidden = true; empty.hidden = false;
      $('#cam-hint').hidden = m !== 'cam'; $('#upload-row').hidden = m !== 'upload';
      stopCam();
      if (m === 'cam') {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { say('This browser cannot open the camera. Use Upload instead.', true); return; }
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } }).then(function (s) {
          stream = s; video.srcObject = s; video.hidden = false; empty.hidden = true; hasImage = true;
        }).catch(function () { say('Camera is blocked or not found. Allow camera access, or use Upload.', true); });
      }
    }
    $$('[data-mode]').forEach(function (b) { b.addEventListener('click', function () { setMode(b.getAttribute('data-mode')); }); });
    $('#file-input').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      if (!/^image\//.test(f.type)) { say('Please choose an image file (JPG or PNG).', true); return; }
      img.onload = function () { img.hidden = false; empty.hidden = true; hasImage = true; say('Photo loaded. Line up your face and outfit with the dashed boxes, then scan.'); };
      img.src = URL.createObjectURL(f);
    });
    $('#choose-btn').addEventListener('click', function () { $('#file-input').click(); });

    function avg(ctx, cw, ch, cx, cy, w, h) {
      var d = ctx.getImageData(Math.round(cw * cx), Math.round(ch * cy), Math.max(2, Math.round(cw * w)), Math.max(2, Math.round(ch * h))).data, t = [0, 0, 0], n = d.length / 4;
      for (var i = 0; i < d.length; i += 4) { t[0] += d[i]; t[1] += d[i + 1]; t[2] += d[i + 2]; }
      return t.map(function (v) { return v / n; });
    }
    $('#scan-btn').addEventListener('click', function () {
      var src = mode === 'cam' ? video : img;
      if (!hasImage || (mode === 'cam' && !video.videoWidth)) { say('No picture yet. Turn on the camera or upload a photo first.', true); return; }
      var c = $('#processCanvas'), ctx = c.getContext('2d', { willReadFrequently: true });
      c.width = src.videoWidth || src.naturalWidth || 640; c.height = src.videoHeight || src.naturalHeight || 480;
      // the preview uses object-fit: cover, so sample the same visible part
      ctx.drawImage(src, 0, 0, c.width, c.height);
      var skin, outfit;
      try { skin = avg(ctx, c.width, c.height, 0.4, 0.3, 0.2, 0.22); outfit = avg(ctx, c.width, c.height, 0.2, 0.7, 0.3, 0.2); }
      catch (err) { say('Could not read that image. Try another photo.', true); return; }
      viewer.classList.remove('scanning'); void viewer.offsetWidth; viewer.classList.add('scanning');
      setTimeout(function () {
        $('#skin-swatch').style.setProperty('--c', toHex(skin)); $('#skin-hex').textContent = toHex(skin);
        $('#outfit-swatch').style.setProperty('--c', toHex(outfit)); $('#outfit-hex').textContent = toHex(outfit);
        var warm = (skin[0] - skin[2]) / Math.max(1, skin[0]) > 0.3;
        var bright = (outfit[0] + outfit[1] + outfit[2]) / 3;
        var p, r, b;
        if (warm) { r = clamp(Math.round(outfit[0] / 255 * 45 + 35), 35, 85); b = clamp(Math.round((255 - bright) / 255 * 45 + 18), 15, 60); p = clamp(100 - r - b + 10, 10, 40); }
        else { p = clamp(Math.round(outfit[2] / 255 * 40 + 35), 35, 80); r = clamp(Math.round(outfit[0] / 255 * 40 + 20), 20, 60); b = clamp(100 - p - r, 5, 30); }
        setValues(p, r, b);
        say((warm ? 'Warm' : 'Cool or neutral') + ' undertone estimate. Sliders set to ' + p + '% pink, ' + r + '% red, ' + b + '% brown. Fine-tune below.');
        $('#studio').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      }, 600);
    });
    window.addEventListener('pagehide', stopCam);
    setMode('upload');   // camera starts only when the person asks for it
  }

  /* ---------- Ideas ---------- */
  var MOODS = {
    everyday: { label: 'Everyday', p: [25, 55], r: [20, 45], b: [10, 25], why: 'Soft and easy to wear with most outfits.' },
    office: { label: 'Office', p: [10, 30], r: [25, 45], b: [30, 55], why: 'Muted, professional, rich without being loud.' },
    date: { label: 'Date night', p: [0, 20], r: [60, 90], b: [10, 35], why: 'Deep and confident, made to be noticed.' },
    festive: { label: 'Festive', p: [30, 60], r: [50, 80], b: [0, 15], why: 'Bright, warm and photo-ready for celebrations.' },
    nude: { label: 'Soft nude', p: [20, 40], r: [5, 20], b: [30, 50], why: 'A natural, skin-close finish.' }
  };
  function rnd(a) { return a[0] + Math.floor(Math.random() * (a[1] - a[0] + 1)); }
  function initIdeas() {
    var grid = $('#idea-grid'), mood = 'everyday', status = $('#idea-status');
    function render() {
      grid.innerHTML = ''; var m = MOODS[mood], used = {};
      for (var i = 0; i < 6; i++) {
        (function (i) {
          var s = { p: rnd(m.p), r: rnd(m.r), b: rnd(m.b), f: i % 3 === 0 ? 'gloss' : (i % 3 === 1 ? 'satin' : 'matte') };
          s.hex = mix(s.p, s.r, s.b).hex; s.name = shadeName(s.p, s.r, s.b);
          used[s.name] = (used[s.name] || 0) + 1; if (used[s.name] > 1) s.name += ' No. ' + used[s.name];
          var card = el('article', 'idea'); card.style.setProperty('--i', i); card.style.setProperty('--c', s.hex);
          card.appendChild(el('div', 'idea__swatch'));
          var body = el('div', 'idea__body');
          body.appendChild(el('h3', '', s.name));
          body.appendChild(el('p', 'small muted', s.hex + ' · ' + s.f.charAt(0).toUpperCase() + s.f.slice(1)));
          body.appendChild(el('p', 'idea__why', m.why + ' ' + ratioText(s) + '.'));
          var btns = el('div', 'idea__btns');
          var open = el('a', 'btn btn--sm', 'Open in studio'); open.href = studioUrl(s);
          var save = el('button', 'btn btn--sm btn--ghost', 'Save'); save.type = 'button';
          save.addEventListener('click', function () {
            var list = read(SAVED, []); list.unshift({ id: String(Date.now()) + i, name: s.name, hex: s.hex, p: s.p, r: s.r, b: s.b, f: s.f, ts: Date.now() });
            toast(write(SAVED, list) ? 'Saved "' + s.name + '"' : 'Could not save: browser storage is blocked');
          });
          btns.appendChild(open); btns.appendChild(save); body.appendChild(btns); card.appendChild(body); grid.appendChild(card);
        })(i);
      }
      status.textContent = 'Showing 6 ' + m.label.toLowerCase() + ' ideas.';
    }
    $$('[data-mood]').forEach(function (b) {
      b.addEventListener('click', function () {
        mood = b.getAttribute('data-mood');
        $$('[data-mood]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        render();
      });
    });
    $('#shuffle-btn').addEventListener('click', render);
    render();
  }

  /* ---------- Saved ---------- */
  function initSaved() {
    var grid = $('#saved-grid'), count = $('#saved-count');
    function tile(s, signature) {
      var t = el('article', 'shade-tile shade-tile--static'); t.style.setProperty('--c', s.hex);
      t.appendChild(el('div', 'shade-tile__color'));
      var body = el('div', 'shade-tile__body');
      body.appendChild(el('div', 'shade-tile__name', s.name));
      body.appendChild(el('div', 'shade-tile__meta', ratioText(s)));
      body.appendChild(el('span', 'shade-tile__hex', s.hex));
      if (signature) { body.appendChild(document.createElement('br')); body.appendChild(el('span', 'badge', 'Signature')); }
      t.appendChild(body);
      var acts = el('div', 'tile-actions');
      var open = el('a', 'btn btn--sm btn--ghost', 'Edit'); open.href = studioUrl(s);
      var go = el('a', 'btn btn--sm', 'Dispense'); go.href = machineUrl(s);
      acts.appendChild(open); acts.appendChild(go);
      if (!signature) {
        var del = el('button', 'icon-btn'); del.type = 'button'; del.setAttribute('aria-label', 'Delete ' + s.name);
        del.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-trash"/></svg>';
        del.addEventListener('click', function () { write(SAVED, read(SAVED, []).filter(function (x) { return x.id !== s.id; })); toast('Removed "' + s.name + '"'); render(); });
        acts.appendChild(del);
      }
      t.appendChild(acts); return t;
    }
    function render() {
      var list = read(SAVED, []);
      grid.innerHTML = '';
      count.textContent = list.length + (list.length === 1 ? ' saved shade' : ' saved shades');
      $('#clear-btn').hidden = !list.length;
      if (!list.length) {
        var e = el('div', 'empty'); e.style.gridColumn = '1 / -1';
        e.appendChild(el('h3', '', 'No saved shades yet'));
        e.appendChild(el('p', '', 'Create a shade in the studio and press Save. It will appear here.'));
        var a = el('a', 'btn', 'Create a shade'); a.href = 'create.html'; a.style.marginTop = '20px'; e.appendChild(a); grid.appendChild(e);
      } else list.forEach(function (s) { grid.appendChild(tile(s, false)); });
    }
    var sig = $('#sig-grid');
    SIGNATURE.forEach(function (s) { sig.appendChild(tile(s, true)); });
    $('#clear-btn').addEventListener('click', function () {
      if (window.confirm('Remove all of your saved shades?')) { write(SAVED, []); render(); toast('Collection cleared'); }
    });
    render();
  }

  /* ---------- Machine ---------- */
  function initMachine() {
    // BACKEND: levels, status and jobs will come from the ESP32 over MQTT via Spring Boot.
    var levels = read(LEVELS, { pink: 85, red: 62, brown: 90 });
    var colors = { pink: '#e4608c', red: '#b01530', brown: '#8a4a30' };
    var running = false, target = null;
    var term = $('#terminal'), bar = $('#progress-bar'), startBtn = $('#start-btn'), status = $('#device-status');
    var stageEls = $$('#stages li');

    function log(msg, ok) { var p = el('p', ok ? 'ok' : '', msg); term.appendChild(p); term.scrollTop = term.scrollHeight; }
    function renderLevels() {
      ['pink', 'red', 'brown'].forEach(function (k) {
        var c = $('#cart-' + k), v = Math.round(levels[k]);
        c.style.setProperty('--lvl', v + '%'); $('#lvl-' + k).textContent = v < 15 ? 'Low ' + v + '%' : v + '%';
        c.classList.toggle('cart--low', v < 15);
      });
    }
    function setTarget(s) {
      target = s;
      $('#target-name').textContent = s.name; $('#target-hex').textContent = s.hex + ' · ' + ratioText(s);
      $('#target-color').style.setProperty('--c', s.hex);
    }
    function jobsList() {
      var ul = $('#jobs'), jobs = read(JOBS, []);
      ul.innerHTML = '';
      if (!jobs.length) { ul.appendChild(el('li', 'muted', 'No jobs yet.')); return; }
      jobs.slice(0, 5).forEach(function (j) {
        var li = el('li'); var d = el('i'); d.style.setProperty('--c', j.hex); li.appendChild(d);
        li.appendChild(el('span', '', j.name)); li.appendChild(el('time', '', new Date(j.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })));
        ul.appendChild(li);
      });
    }
    function setStage(n) { stageEls.forEach(function (li, i) { li.classList.toggle('on', i <= n); }); }

    function run() {
      if (running || !target) return;
      var m = mix(target.p, target.r, target.b).pct;
      var cost = { pink: m.pink * 0.12, red: m.red * 0.12, brown: m.brown * 0.12 };
      var short = ['pink', 'red', 'brown'].filter(function (k) { return cost[k] > 0 && levels[k] - cost[k] < 5; });
      if (short.length) { log('Cannot start: ' + short.join(', ') + ' cartridge too low. Press Refill.'); toast('A cartridge is too low. Refill first.'); return; }
      running = true; startBtn.disabled = true; status.textContent = 'Mixing'; $('#status-dot').classList.add('dot--warn');
      bar.style.width = '0%'; setStage(0);
      var steps = [
        [0, 'Formula received: ' + target.name + ' (' + ratioText(target) + ')'],
        [1, 'Pumping micro-doses from the pink, red and brown cartridges...'],
        [2, 'Stirring and warming the mix until smooth...'],
        [3, 'Moulding the lipstick bullet...'],
        [4, 'Done. Lipstick bullet ready (demo colour only).']
      ];
      steps.forEach(function (s, i) {
        setTimeout(function () {
          setStage(s[0]); bar.style.width = ((i + 1) / steps.length * 100) + '%'; log(s[1], i === steps.length - 1);
          if (i === 1) { ['pink', 'red', 'brown'].forEach(function (k) { levels[k] = Math.max(0, levels[k] - cost[k]); }); write(LEVELS, levels); renderLevels(); }
          if (i === steps.length - 1) {
            var jobs = read(JOBS, []); jobs.unshift({ name: target.name, hex: target.hex, ts: Date.now() }); write(JOBS, jobs.slice(0, 20));
            jobsList(); running = false; startBtn.disabled = false; status.textContent = 'Ready'; $('#status-dot').classList.remove('dot--warn'); toast('Dispense finished');
          }
        }, 700 + i * 900);
      });
    }
    startBtn.addEventListener('click', run);
    $('#refill-btn').addEventListener('click', function () { levels = { pink: 100, red: 100, brown: 100 }; write(LEVELS, levels); renderLevels(); log('Cartridges refilled to 100%.'); toast('Cartridges refilled'); });

    var d = { p: 30, r: 70, b: 0 };
    if (param('p') !== null || param('r') !== null || param('b') !== null) d = { p: num(param('p'), 0), r: num(param('r'), 0), b: num(param('b'), 0) };
    d.hex = mix(d.p, d.r, d.b).hex; d.name = param('name') || shadeName(d.p, d.r, d.b);
    setTarget(d); renderLevels(); jobsList();
    log('Controller started in simulation mode. No hardware connected.');
    if (param('p') !== null || param('r') !== null || param('b') !== null) { log('Formula received from the studio.'); setTimeout(run, 900); }
  }

  /* ---------- Boot ---------- */
  var page = document.body.getAttribute('data-page');
  var inits = { home: initHome, create: initCreate, ideas: initIdeas, saved: initSaved, machine: initMachine };
  if (inits[page]) inits[page]();
})();
