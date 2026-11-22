/* Waitlist form: saves an email (with consent) to Firestore using the REST API. */
(function () {
  var cfg = window.AURABLEND || {}, fb;
  var form = document.getElementById('waitlist-form'); if (!form) return;
  var msg = document.getElementById('wl-msg'), btn = form.querySelector('button[type=submit]');
  function say(t, ok) { msg.textContent = t; msg.className = 'wl-msg ' + (ok ? 'is-ok' : 'is-err'); msg.hidden = false; }
  function sha(s) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)).then(function (b) {
      return Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
    });
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var email = form.email.value.trim().toLowerCase();
    if (form.company.value) return;                       // honeypot
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { say('Please enter a valid email address.', false); form.email.focus(); return; }
    if (!form.consent.checked) { say('Please tick the box so we know you agree.', false); form.consent.focus(); return; }
    fb = (window.AURABLEND || {}).firebase || {};
    if (!fb.projectId || !fb.apiKey) {
      say('The list is not switched on yet. Please email ' + cfg.contactEmail + ' and we will add you.', false); return;
    }
    btn.disabled = true; btn.textContent = 'Saving...';
    sha(email).then(function (id) {
      var url = 'https://firestore.googleapis.com/v1/projects/' + encodeURIComponent(fb.projectId) +
        '/databases/(default)/documents/waitlist?documentId=' + id + '&key=' + encodeURIComponent(fb.apiKey);
      return fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: {
          email: { stringValue: email },
          name: { stringValue: form.fname.value.trim().slice(0, 80) },
          consent: { booleanValue: true },
          consentText: { stringValue: 'Agreed to be emailed about the AuraBlend machine; see privacy policy (5 Nov 2026 version).' },
          createdAt: { timestampValue: new Date().toISOString() },
          source: { stringValue: 'landing-page' }
        } })
      });
    }).then(function (r) {
      if (r.ok) { form.reset(); say('You are on the list. We will only email you about the AuraBlend machine.', true); }
      else if (r.status === 409) { say('That email is already on the list. Thank you!', true); }
      else { say('Something went wrong. Please try again, or email ' + cfg.contactEmail + '.', false); }
    }).catch(function () { say('Could not connect. Please try again, or email ' + cfg.contactEmail + '.', false); })
      .then(function () { btn.disabled = false; btn.textContent = 'Join the early list'; });
  });
})();
