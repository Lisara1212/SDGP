/* =====================================================
   AuraBlend - social.js   (Continue with Google / Microsoft)
   1. Create a Google OAuth client ID and/or a Microsoft Entra app (see README.md),
      then paste the IDs below. Until then the buttons explain that they are not set up.
   2. DEMO: the provider's name + email create an account in this browser, same as the email form.
      BACKEND: send the provider's token to Spring Boot (POST /api/auth/google | /api/auth/microsoft),
      verify it on the server, and return your own session. Never trust the browser alone in production.
   ===================================================== */
(function (w, d) {
  'use strict';
  var CONFIG = {
    googleClientId: '94915987559-gv0hpt70h9bospne1cegjsp761f8jet4.apps.googleusercontent.com',
    microsoftClientId: ''      // the Application (client) ID from Microsoft Entra
  };
  var USERS = 'aurablend_users_v1', SESSION = 'aurablend_session_v1';
  var wrap = d.querySelector('.social'); if (!wrap) return;
  var note = d.getElementById('social-msg');
  function say(t, err) { note.textContent = t; note.hidden = !t; note.className = 'notice' + (err ? ' notice--err' : ''); }
  function load(src) {
    return new Promise(function (res, rej) {
      var s = d.createElement('script'); s.src = src; s.async = true; s.onload = res; s.onerror = function () { rej(new Error('load')); }; d.head.appendChild(s);
    });
  }
  function readUsers() { try { var v = JSON.parse(localStorage.getItem(USERS)); return Array.isArray(v) ? v : []; } catch (e) { return []; } }

  // provider gave us a name + email: sign in to the matching account, or make one
  function finish(provider, p) {
    var email = String(p.email || '').trim().toLowerCase(), name = String(p.name || '').trim() || email.split('@')[0];
    if (!email) { say('That account did not share an email address, so we cannot sign you in with it.', true); return; }
    var users = readUsers(), u = users.filter(function (x) { return x.email === email; })[0];
    if (!u) {
      u = { id: String(Date.now()), name: name, email: email, provider: provider, ts: Date.now() };
      if (new URLSearchParams(location.search).get('interest') === 'machine') u.machine = { requested: true, ts: Date.now() };
      users.push(u);
      try { localStorage.setItem(USERS, JSON.stringify(users)); } catch (e) { say('Could not sign in: browser storage is blocked.', true); return; }
    }
    try { localStorage.setItem(SESSION, JSON.stringify({ name: u.name, email: u.email, ts: Date.now() })); sessionStorage.removeItem(SESSION); }
    catch (e) { say('Could not sign in: browser storage is blocked.', true); return; }
    say('Welcome, ' + String(u.name).split(' ')[0] + '. Taking you to the studio...');
    setTimeout(function () { w.location.href = 'create.html'; }, 700);
  }

  /* The sign-in pop-up must open straight from the click, or browsers block it. So the Google and
     Microsoft libraries are loaded as soon as the page opens, and the click only opens the window. */
  var gClient = null, gWaiter = null, msApp = null, msReady = false;

  function setupGoogle() {
    if (!CONFIG.googleClientId) return;
    load('https://accounts.google.com/gsi/client').then(function () {
      gClient = w.google.accounts.oauth2.initTokenClient({
        client_id: CONFIG.googleClientId, scope: 'openid email profile',
        callback: function (r) {
          var wt = gWaiter; gWaiter = null;
          if (!r || !r.access_token) { say('Google did not approve the sign-in' + (r && r.error ? ' (' + r.error + ')' : '') + '. Make sure you picked a test-user account.', true); return; }
          fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: 'Bearer ' + r.access_token } })
            .then(function (x) { return x.json(); })
            .then(function (info) { finish('google', { name: info.name, email: info.email }); })
            .catch(function () { say('Google signed you in, but we could not read your name and email. Try again.', true); });
        },
        error_callback: function (e) {
          gWaiter = null;
          var t = e && e.type;
          say(t === 'popup_closed' ? 'The Google window was closed before finishing. Try again.' : t === 'popup_failed_to_open' ? 'Your browser blocked the Google window. Allow pop-ups for this site and try again.' : 'Google sign-in failed' + (t ? ' (' + t + ')' : '') + '. Try again, or use your email.', true);
        }
      });
    }).catch(function () { console.warn('AuraBlend: could not load the Google sign-in library.'); });
  }
  function setupMicrosoft() {
    if (!CONFIG.microsoftClientId) return;
    load('https://alcdn.msauth.net/browser/2.38.3/js/msal-browser.min.js').then(function () {
      msApp = new w.msal.PublicClientApplication({ auth: { clientId: CONFIG.microsoftClientId, authority: 'https://login.microsoftonline.com/common', redirectUri: location.origin + location.pathname } });
      return Promise.resolve(msApp.initialize ? msApp.initialize() : null);
    }).then(function () { msReady = true; }).catch(function () { console.warn('AuraBlend: could not load the Microsoft sign-in library.'); });
  }
  function clickGoogle() {
    if (!gClient) { say('Google sign-in is still loading (or was blocked by an extension). Wait a second and press the button again.', true); return; }
    say(''); gWaiter = true;
    gClient.requestAccessToken({ prompt: 'select_account' });          // opens the pop-up right now, from the click
  }
  function clickMicrosoft() {
    if (!msReady) { say('Microsoft sign-in is still loading (or was blocked by an extension). Wait a second and press the button again.', true); return; }
    say('');
    msApp.loginPopup({ scopes: ['openid', 'profile', 'email'] }).then(function (r) {
      var c = r.idTokenClaims || {};
      finish('microsoft', { name: (r.account && r.account.name) || c.name, email: c.email || c.preferred_username || (r.account && r.account.username) });
    }).catch(function () { say('Could not sign in with Microsoft. The window may have been closed or blocked. Try again, or use your email.', true); });
  }

  [].forEach.call(wrap.querySelectorAll('[data-provider]'), function (btn) {
    btn.addEventListener('click', function () {
      var prov = btn.getAttribute('data-provider'), id = prov === 'google' ? CONFIG.googleClientId : CONFIG.microsoftClientId, label = prov === 'google' ? 'Google' : 'Microsoft';
      if (!id) { say(label + ' sign-in is not switched on yet. The team needs to add the ' + label + ' client ID in social.js (steps are in README.md). Please use your email for now.', true); return; }
      if (prov === 'google') clickGoogle(); else clickMicrosoft();
    });
  });
  setupGoogle(); setupMicrosoft();
  w.AuraSocial = { finish: finish };
})(window, document);
