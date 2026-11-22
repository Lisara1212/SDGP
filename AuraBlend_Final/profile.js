/* AuraBlend - profile page logic (uses auth.js). */
(function () {
  'use strict';
  var A = window.AuraAuth, $ = function (s) { return document.querySelector(s); };
  var u = A && A.user();
  if (!u) { window.location.replace('login.html'); return; }
  function jr(k) { try { var v = JSON.parse(localStorage.getItem(k + '::' + u.id)); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function render() {
    u = A.user();
    $('#pf-av').textContent = A.initials(u); $('#pf-name').textContent = u.name; $('#pf-email').textContent = u.email;
    $('#pf-since').textContent = new Date(+u.id || u.ts || Date.now()).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    $('#pf-shades').textContent = jr('aurablend_saved_v2').length; $('#pf-jobs').textContent = jr('aurablend_jobs_v2').length;
    var m = u.machine && u.machine.requested;
    $('#pf-machine').textContent = m ? 'On the early list since ' + new Date(u.machine.ts).toLocaleDateString() : 'Not requested yet';
    $('#pf-machine-btn').hidden = !!m; $('#pf-name-input').value = u.name;
  }
  function say(t, err) { var n = $('#pf-msg'); n.textContent = t; n.hidden = !t; n.className = 'notice' + (err ? ' notice--err' : ''); }
  $('#pf-name-form').addEventListener('submit', function (e) {
    e.preventDefault(); var v = $('#pf-name-input').value.trim().replace(/\s+/g, ' ');
    if (v.length < 2) { say('Your name must be at least 2 characters.', true); return; }
    if (A.update({ name: v })) { say('Name updated.'); render(); } else say('Could not save: browser storage is blocked.', true);
  });
  $('#pf-machine-btn').addEventListener('click', function () { if (A.requestMachine()) { say('You are on the early list for the machine.'); render(); } });
  $('#pf-export').addEventListener('click', function () {
    var blob = new Blob([JSON.stringify(A.exportData(), null, 2)], { type: 'application/json' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'aurablend-my-data.json'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });
  $('#pf-logout').addEventListener('click', A.logout);
  $('#pf-delete').addEventListener('click', function () {
    if (window.confirm('Delete your account and all saved shades and machine jobs from this browser? This cannot be undone.')) A.deleteAccount();
  });
  render();
})();
