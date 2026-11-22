# AuraBlend front end (glass edition)

Open it through a web server (for example the VS Code "Live Server" extension, or Vercel). Camera access needs http(s), not file://.

- Look: glassmorphism, light by default, with a sun/moon button for dark. Styles: `style.css` (base) + `glass.css` (the glass skin, linked last). Remove the glass.css link to get the flat version.
- Studio camera: two fixed boxes (SKIN and OUTFIT). Works for the live camera (mirrored view) and uploaded photos (the crop shown is the crop measured).
- Team photos: put JPGs in `team/` named lisara-aponsu.jpg, kawmini-dissanayaka.jpg, dhananjaya-adeepa.jpg, kabilan-jeyakrishnan.jpg, mineli-kahanda.jpg. The LinkedIn links are only a fallback and expire on 19 Nov 2026.
- `404.html`, `sitemap.xml`, `robots.txt` and Open Graph tags are included (domain https://www.aurablend.lk).
- Saved shades, cartridge levels and jobs live in localStorage for now. Search `BACKEND:` in app.js for the Spring Boot / MQTT hooks.

## Accounts (demo, in this browser)
- `auth.js` is shared by all pages: logged-in people see their first name + avatar (menu: profile, collection, log out) instead of "Get the machine".
- Each account has its own saved shades, machine jobs and cartridge levels. `profile.html` shows their details, lets them edit their name, request the machine, download their data and delete their account.
- Passwords are stored as salted PBKDF2 hashes. Photos are never stored.
- This is a front-end demo: data lives in the visitor's own browser. For real accounts, build the Spring Boot + MySQL back end (bcrypt/Argon2 passwords, HTTPS, httpOnly-cookie sessions, one row per user) and replace the functions marked `BACKEND:` in auth.js.

## Continue with Google / Microsoft (social.js)
Both buttons are on `login.html` and `signup.html`. They stay "not switched on" until you paste the IDs at the top of `social.js`.
- **Google:** console.cloud.google.com → create a project → APIs & Services → OAuth consent screen (External) → Credentials → Create OAuth client ID → *Web application*. Under *Authorized JavaScript origins* add `https://www.aurablend.lk` (and `http://localhost:5500` for testing). Paste the client ID into `googleClientId`.
- **Microsoft:** entra.microsoft.com → App registrations → New registration → account type *Any Entra directory + personal Microsoft accounts* → Redirect URI (platform *Single-page application*): `https://www.aurablend.lk/login.html` and `https://www.aurablend.lk/signup.html`. Paste the Application (client) ID into `microsoftClientId`.
- Demo mode creates a local account from the provider's name + email. For production, verify the token in Spring Boot (BACKEND: notes in social.js).

## Landing page
`index.html` is now a marketing landing page (problem, how it works, benefits, who it is for, the machine, FAQ). Its extra styles are in `landing.css`. The app pages (Studio, Machine simulator, Saved, Ideas) are unchanged and linked as the demo.

## Waitlist (real storage)
1. Create a Firebase project, enable Cloud Firestore, copy `projectId` and the web `apiKey` into `site-config.js`.
2. Publish these Firestore rules (anyone can add one entry, nobody can read or change the list from the website):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /waitlist/{id} {
      allow create: if request.resource.data.keys().hasOnly(['email','name','consent','consentText','createdAt','source'])
                    && request.resource.data.consent == true
                    && request.resource.data.email is string && request.resource.data.email.size() < 255;
      allow read, update, delete: if false;
    }
  }
}
```
3. Set `contactEmail` (and the social links) in `site-config.js`. Read the entries in the Firebase console.

## Hero carousel
The home hero (landing.js + the .kh rules in landing.css) is a shade carousel: click a shade, use the arrows, swipe or press the arrow keys. Shades come from `SIGNATURE` in app.js.
