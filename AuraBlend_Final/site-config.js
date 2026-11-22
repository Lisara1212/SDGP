/* AuraBlend site settings: edit this one file. */
window.AURABLEND = {
  contactEmail: 'aurablendlk@gmail.com',
  social: {                               // leave '' to hide a link
    linkedin: 'https://www.linkedin.com/company/aurablend123/',
    instagram: 'https://www.instagram.com/aurablendlk?srtk=MTJvZjc3OGwxaWlkZQ==',
    facebook: 'https://www.facebook.com/share/1FcUeJAHaQ/'
  },
  /* Waitlist storage: Cloud Firestore via its REST API. Fill these two from
     Firebase console > Project settings, then publish the rules in README.md. */
  firebase: { projectId: '', apiKey: '' }
};
(function () {
  function fill() {
    var c = window.AURABLEND.contactEmail;
    [].forEach.call(document.querySelectorAll('[data-contact-email]'), function (n) {
      n.textContent = c;
      if (n.tagName === 'A') n.href = 'mailto:' + c;
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fill); else fill();
})();
