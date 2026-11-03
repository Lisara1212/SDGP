/* =====================================================
   AuraBlend - auth.js   (shared by every page)
   DEMO accounts kept in this browser (localStorage). Each account gets its own
   saved shades, machine jobs and cartridge levels.
   BACKEND: when Spring Boot + MySQL are ready, replace user(), update(), logout()
   and hash() with calls to /api/auth/* and keep the rest of the pages as they are.
   ===================================================== */
(function (w) {
  'use strict';
  var USERS = 'aurablend_users_v1', SESSION = 'aurablend_session_v1';
  var d = document;

  function rj(store, k) { try { return JSON.parse(store.getItem(k)); } catch (e) { return null; } }
  function users() { var v = rj(localStorage, USERS); return Array.isArray(v) ? v : []; }
  function saveUsers(l) { try { localStorage.setItem(USERS, JSON.stringify(l)); return true; } catch (e) { return false; } }
  function session() { return rj(sessionStorage, SESSION) || rj(localStorage, SESSION); }
  function clearSession() { try { sessionStorage.removeItem(SESSION); localStorage.removeItem(SESSION); } catch (e) {} }

  function user() {
    var s = session(); if (!s || !s.email) return null;
    var u = users().filter(function (x) { return x.email === s.email; })[0];
    if (!u) { clearSession(); return null; }
    return u;
  }
  function first(u) { return String((u && u.name) || '').trim().split(/\s+/)[0] || 'Account'; }
  function initials(u) { var p = String((u && u.name) || '?').trim().split(/\s+/); return ((p[0] || '?')[0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase(); }
  // storage key for the current person: guests share the plain key, accounts get their own
  function key(base) { var u = user(); return u ? base + '::' + u.id : base; }
  function update(patch) {
    var u = user(); if (!u) return false;
    var l = users(); l.forEach(function (x) { if (x.id === u.id) for (var k in patch) x[k] = patch[k]; });
    if (patch.name) { var s = session(); if (s) { s.name = patch.name; try { (rj(sessionStorage, SESSION) ? sessionStorage : localStorage).setItem(SESSION, JSON.stringify(s)); } catch (e) {} } }
    return saveUsers(l);
  }
  function requestMachine() { return update({ machine: { requested: true, ts: Date.now() } }); }
  function logout() { clearSession(); w.location.href = 'index.html'; }
  function deleteAccount() {
    var u = user(); if (!u) return;
    ['aurablend_saved_v2', 'aurablend_levels_v2', 'aurablend_jobs_v2'].forEach(function (b) { try { localStorage.removeItem(b + '::' + u.id); } catch (e) {} });
    saveUsers(users().filter(function (x) { return x.id !== u.id; }));
    clearSession(); w.location.href = 'index.html';
  }
  function exportData() {
    var u = user(); if (!u) return null;
    function g(b) { return rj(localStorage, b + '::' + u.id); }
    return { account: { name: u.name, email: u.email, createdAt: new Date(+u.id || u.ts || 0).toISOString(), machine: u.machine || null },
             savedShades: g('aurablend_saved_v2') || [], machineJobs: g('aurablend_jobs_v2') || [], note: 'Password is never exported. No photos are ever stored.' };
  }

  // Password hashing. 'p1' = PBKDF2-SHA-256, 150,000 rounds (new accounts). Older accounts keep the old check until they next sign up.
  function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (x) { return x.toString(16).padStart(2, '0'); }).join(''); }
  function hash(salt, pw, kdf) {
    var enc = new TextEncoder();
    if (!(w.crypto && crypto.subtle && w.TextEncoder)) { var h = 5381, s = salt + pw; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return Promise.resolve('x' + (h >>> 0).toString(16)); }
    if (kdf === 'p1') return crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']).then(function (k) {
      return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: 150000 }, k, 256);
    }).then(hex);
    return crypto.subtle.digest('SHA-256', enc.encode(salt + pw)).then(hex);
  }

  w.AuraAuth = { user: user, first: first, initials: initials, key: key, update: update, requestMachine: requestMachine, logout: logout,
                 deleteAccount: deleteAccount, exportData: exportData, hash: hash, users: users };

  /* ---------- header chip, footer links, machine band ---------- */
  function el(tag, cls, text) { var e = d.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function countOf(base, u) { var v = rj(localStorage, base + '::' + u.id); return Array.isArray(v) ? v.length : 0; }

  function buildAccount(u) {
    var wrap = el('div', 'account'), btn = el('button', 'account__btn');
    btn.type = 'button'; btn.setAttribute('aria-haspopup', 'true'); btn.setAttribute('aria-expanded', 'false');
    btn.appendChild(el('span', 'account__av', initials(u))); btn.appendChild(el('span', 'account__name', first(u)));
    var menu = el('div', 'account__menu'); menu.hidden = true;
    var head = el('div', 'account__head'); head.appendChild(el('b', '', u.name)); head.appendChild(el('small', '', u.email)); menu.appendChild(head);
    [['profile.html', 'Profile & details'], ['saved.html', 'My collection (' + countOf('aurablend_saved_v2', u) + ')'], ['machine.html', 'The machine']].forEach(function (x) { var a = el('a', '', x[1]); a.href = x[0]; menu.appendChild(a); });
    var out = el('button', 'account__out', 'Log out'); out.type = 'button'; out.addEventListener('click', logout); menu.appendChild(out);
    function close() { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
    btn.addEventListener('click', function (e) { e.stopPropagation(); menu.hidden = !menu.hidden; btn.setAttribute('aria-expanded', String(!menu.hidden)); });
    d.addEventListener('click', function (e) { if (!wrap.contains(e.target)) close(); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    wrap.appendChild(btn); wrap.appendChild(menu); return wrap;
  }

  function init() {
    var u = user(), cta = d.querySelector('.header-cta');
    d.documentElement.classList.toggle('is-auth', !!u);
    if (u && cta) cta.replaceWith(buildAccount(u));
    // guests: the header shows one button, "Log in" (see the markup); logged-in people get their name chip above
    [].forEach.call(d.querySelectorAll('[data-guest]'), function (n) { n.hidden = !!u; });
    [].forEach.call(d.querySelectorAll('[data-user]'), function (n) { n.hidden = !u; });
    var plate = d.querySelector('.get-machine__plate');
    if (u && plate) {
      var h = plate.querySelector('h2'), p = plate.querySelector('p'), b = plate.querySelector('a.btn');
      h.textContent = 'Hi ' + first(u) + ', want the AuraBlend machine?';
      function state() {
        var m = u.machine && u.machine.requested;
        p.textContent = m ? 'You are on the early list since ' + new Date(u.machine.ts).toLocaleDateString() + '. We will email ' + u.email + ' when it is ready.' : 'Request it with one tap and we will keep you on the early list for the mixing machine and its parts.';
        b.textContent = m ? 'On the list ✓' : 'Request the machine';
        b.setAttribute('aria-disabled', String(!!m));
      }
      b.removeAttribute('href'); b.setAttribute('role', 'button'); b.tabIndex = 0;
      function go() { if (u.machine && u.machine.requested) return; if (requestMachine()) { u = user(); state(); } }
      b.addEventListener('click', go); b.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
      state();
    }
    var gn = d.getElementById('guest-note'); if (gn) gn.hidden = !!u;
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', init); else init();
})(window);
