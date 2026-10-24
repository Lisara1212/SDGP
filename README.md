# AuraBlend front end (HTML, CSS, JavaScript)

Plain static files. No build step and no libraries. Open `index.html` in a browser,
or use VS Code "Live Server" so links and fonts behave like a real site.

## Files
| File | Screen |
|---|---|
| `index.html` | Home |
| `signup.html` | Sign up |
| `login.html` | Log in |
| `create.html` | Create shade (RGB sliders, finish, save) |
| `ideas.html` | AI ideas (describe your look, filter chips) |
| `collection.html` | My collection (shows shades you save) |
| `tryon.html` | Virtual try-on |
| `machine-find.html` | Machine setup: find your machine |
| `machine-connecting.html` | Machine setup: connecting (moves on after 4 seconds) |
| `machine-connected.html` | Machine setup: connected |
| `machine-disconnected.html` | Machine setup: reconnect |
| `machine.html` | Machine: recipe, reservoirs, job progress |
| `style.css` | All styles (includes smooth scrolling, see the `html` rule) |
| `script.js` | All behaviour |

## Smooth scrolling
`style.css` sets `html { scroll-behavior: smooth; }`, and `script.js` smooth-scrolls `#anchor` links.
Both switch off automatically for people who turned on "reduce motion" in their system.

## What is real and what is demo
- Real in the browser: sliders, finish chips, saving shades (kept in the browser with localStorage),
  filters, shade picker on try-on, photo upload preview, form checks.
- Demo only: sign up and log in just check the fields and go to Home. The machine screens are
  simulated. Connect them to your Spring Boot API and the ESP32 (MQTT) later.
- Fonts (Fraunces and DM Sans) load from Google Fonts, so you need an internet connection to see them.

## Connecting to your backend later
Replace the `localStorage` code in `script.js` (`loadShades` / `saveShades`) with `fetch()` calls to
your Spring Boot endpoints, for example `GET /api/shades` and `POST /api/shades`.
