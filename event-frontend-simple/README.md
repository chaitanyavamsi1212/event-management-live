# HackFest — Frontend (Plain HTML / CSS / JS)

No framework, no build step, no npm install. Just static files that call
your Node/Express backend directly with `fetch`.

## Files

```
event-frontend-html/
├── index.html          ← login page (3 tabs: Student/Organizer/Admin)
├── student.html         ← student dashboard (event grid)
├── organizer.html        ← organizer dashboard (create events, notify)
├── admin.html            ← admin dashboard (approvals, stats, events)
├── css/
│   ├── base.css          ← design tokens (colors, fonts) + resets
│   ├── background.css    ← hackathon animated background
│   ├── login.css
│   ├── topbar.css        ← shared header on all 3 dashboards
│   ├── event-card.css    ← shared event card styling
│   ├── student.css       ← also reused by organizer/admin for shared layout bits
│   ├── organizer.css
│   └── admin.css
└── js/
    ├── api.js            ← all backend calls in one place (edit API_URL here)
    ├── background.js     ← builds the animated background
    ├── topbar.js         ← builds the shared header + logout
    ├── event-card.js     ← builds one event card's HTML
    ├── login.js           ← login page logic
    ├── student.js
    ├── organizer.js
    └── admin.js
```

## 1. Point it at your backend

Open `js/api.js` and confirm the first line matches where your backend runs:
```js
const API_URL = 'http://localhost:3000';
```

## 2. Run it

You can't just double-click `index.html` reliably (some browsers block
`fetch` from `file://` pages) — serve it with any simple static server.

**Option A — Python (already on most machines):**
```bash
cd event-frontend-html
python3 -m http.server 3001
```

**Option B — Node's `serve` package:**
```bash
npx serve event-frontend-html -p 3001
```

Then open:
```
http://localhost:3001
```

## 3. Backend requirements

Your backend must be running (`npm run dev` in `event-backend`) and must
include the image-upload update (multer + `image_url` column). If your
database already existed before that update, run:
```bash
psql -U postgres -d event_management -f db/migration_add_image.sql
```
and `npm install` again in the backend to pull in `multer`.

## How auth works here (no framework, so worth knowing)

- On login/signup, `saveSession()` in `js/api.js` stores the JWT and user
  object in `localStorage`.
- Every dashboard page (`student.html`, `organizer.html`, `admin.html`)
  calls `requireRole('student' | 'organizer' | 'admin')` at the top of its
  script — this reads `localStorage`, checks the role matches the page,
  and redirects to `index.html` if not.
- `logout()` clears `localStorage` and redirects back to the login page.
- Every API call in `js/api.js` automatically attaches
  `Authorization: Bearer <token>` from `localStorage` — you never have to
  pass the token manually anywhere else in the code.

## Notes

- CORS is already enabled on the backend, so calling `localhost:3000` from
  a page served on `localhost:3001` works with no proxy needed.
- No payment UI, per your no-payment resume version — organizers can still
  set an entry fee and it shows on the event card, but there's no "pay"
  button wired up.
- Admin can replace any event's image from the admin dashboard (separate
  from the organizer's own upload at event-creation time).
