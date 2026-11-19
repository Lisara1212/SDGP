/* AuraBlend account pages (sign in + sign up). Demo mode: accounts live in this browser (localStorage).
   Passwords are stored as salted PBKDF2-SHA-256 hashes. Replace with Firebase Authentication for production. */
(function () {
  'use strict';
  var GOOGLE_CLIENT_ID = '94915987559-gv0hpt70h9bospne1cegjsp761f8jet4.apps.googleusercontent.com';
  var USERS = 'aurablend_users_v1', SESSION = 'aurablend_session_v1', NEXT = 'home.html';
  var $ = function (id) { return document.getElementById(id); };
  var login = $('login-form'), signup = $('signup-form'), form = login || signup;
  var msg = $('form-msg'), submit = $('submit-btn'), idle = submit.textContent.trim();

  try { if (JSON.parse(localStorage.getItem(SESSION) || sessionStorage.getItem(SESSION))) { location.replace(NEXT); return; } } catch (e) {}

  function readUsers() { try { var v = JSON.parse(localStorage.getItem(USERS)); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function writeUsers(l) { try { localStorage.setItem(USERS, JSON.stringify(l)); return true; } catch (e) { return false; } }
  function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (x) { return x.toString(16).padStart(2, '0'); }).join(''); }
  function salt() { var a = new Uint8Array(16); crypto.getRandomValues(a); return hex(a); }
  function kdf(pw, s) {
    var enc = new TextEncoder();
    return crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']).then(function (k) {
      return crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(s), iterations: 150000, hash: 'SHA-256' }, k, 256);
    }).then(hex);
  }
  function legacySha(str) { return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)).then(hex); }
  function say(el, t, ok) { el.textContent = t; el.className = 'form-msg' + (ok ? ' ok' : ''); el.hidden = !t; }
  function err(id, t) {
    var i = $(id), e = $(id + '-err'); if (!i || !e) return !t;
    e.textContent = t || ''; e.hidden = !t;
    if (t) i.setAttribute('aria-invalid', 'true'); else i.removeAttribute('aria-invalid');
    return !t;
  }
  function busy(b, t) { submit.disabled = b; submit.textContent = b ? t : idle; }
  function begin(user) {
    try {
      localStorage.setItem(SESSION, JSON.stringify({ name: user.name, email: user.email, ts: Date.now() }));
      sessionStorage.removeItem(SESSION);
    } catch (e) { return false; }
    return true;
  }
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var rules = {
    name: function (v) { v = v.trim(); return !v ? 'Enter your full name.' : v.length < 2 ? 'Your name must be at least 2 characters.' : ''; },
    email: function (v) { v = v.trim(); return !v ? 'Enter your email address.' : EMAIL.test(v) ? '' : 'Enter a valid email address, like name@example.com.'; },
    password: function (v) {
      if (!v) return signup ? 'Create a password.' : 'Enter your password.';
      if (!signup) return '';
      return v.length < 8 ? 'Use at least 8 characters.' : (/[A-Za-z]/.test(v) && /\d/.test(v)) ? '' : 'Include at least one letter and one number.';
    },
    confirm: function (v) { return !v ? 'Repeat your password.' : v === $('password').value ? '' : 'The passwords do not match.'; }
  };
  var ids = signup ? ['name', 'email', 'password', 'confirm'] : ['email', 'password'];
  ids.forEach(function (id) {
    $(id).addEventListener('input', function () { if ($(id).hasAttribute('aria-invalid')) err(id, rules[id]($(id).value)); say(msg, ''); });
  });
  function validate() { var first = null; ids.forEach(function (id) { if (!err(id, rules[id]($(id).value)) && !first) first = $(id); }); if (first) first.focus(); return !first; }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault(); say(msg, '');
    if (!validate()) return;
    if (!(window.crypto && crypto.subtle)) { say(msg, 'This browser cannot secure passwords here. Open the site over https.'); return; }
    var email = $('email').value.trim().toLowerCase(), pw = $('password').value;
    if (signup) {
      busy(true, 'Creating account...');
      if (readUsers().some(function (u) { return u.email === email; })) { busy(false); err('email', 'An account with this email already exists. Sign in instead.'); return; }
      var s = salt();
      kdf(pw, s).then(function (h) {
        var l = readUsers();
        l.push({ id: String(Date.now()), name: $('name').value.trim(), email: email, salt: s, hash: h, kdf: 'p1', ts: Date.now() });
        if (!writeUsers(l) || !begin(l[l.length - 1])) { busy(false); say(msg, 'Could not save your account: browser storage is blocked.'); return; }
        say(msg, 'Account created. Taking you in...', true); setTimeout(function () { location.href = NEXT; }, 600);
      }).catch(function () { busy(false); say(msg, 'Something went wrong. Please try again.'); });
    } else {
      busy(true, 'Signing in...');
      var u = readUsers().filter(function (x) { return x.email === email; })[0];
      var bad = function () { busy(false); say(msg, 'That email and password do not match an account.'); };
      if (!u || !u.hash) { bad(); return; }
      (u.kdf === 'p1' ? kdf(pw, u.salt) : legacySha(u.salt + pw)).then(function (h) {
        if (h !== u.hash) { bad(); return; }
        if (!begin(u)) { busy(false); say(msg, 'Could not sign in: browser storage is blocked.'); return; }
        location.href = NEXT;
      }).catch(function () { busy(false); say(msg, 'Something went wrong. Please try again.'); });
    }
  });

  /* Google sign-in (token client; library preloaded so the pop-up opens straight from the click) */
  var gBtn = $('google-btn'), note = $('social-msg'), gClient = null;
  function finish(info) {
    var email = String(info.email || '').trim().toLowerCase(), name = String(info.name || '').trim() || email.split('@')[0];
    if (!email) { say(note, 'That Google account did not share an email address.'); return; }
    var l = readUsers(), u = l.filter(function (x) { return x.email === email; })[0];
    if (!u) { u = { id: String(Date.now()), name: name, email: email, provider: 'google', ts: Date.now() }; l.push(u); }
    if (!writeUsers(l) || !begin(u)) { say(note, 'Could not sign in: browser storage is blocked.'); return; }
    say(note, 'Welcome, ' + u.name.split(' ')[0] + '. Taking you in...', true); setTimeout(function () { location.href = NEXT; }, 600);
  }
  var s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
  s.onload = function () {
    gClient = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID, scope: 'openid email profile',
      callback: function (r) {
        if (!r || !r.access_token) { say(note, 'Google did not approve the sign-in. Make sure you use a test-user account.'); return; }
        fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: 'Bearer ' + r.access_token } })
          .then(function (x) { return x.json(); }).then(finish)
          .catch(function () { say(note, 'Could not read your Google name and email. Try again.'); });
      },
      error_callback: function (e) { say(note, e && e.type === 'popup_closed' ? 'The Google window was closed before finishing.' : 'Your browser blocked the Google window. Allow pop-ups for this site.'); }
    });
  };
  document.head.appendChild(s);
  gBtn.addEventListener('click', function () {
    if (!gClient) { say(note, 'Google sign-in is still loading (or blocked by an extension). Wait a moment and try again.'); return; }
    say(note, ''); gClient.requestAccessToken({ prompt: 'select_account' });
  });
})();
