# Common Ground site

The public site, sign-in and dashboard. Plain HTML, CSS and ES modules: no build step. Live at
https://common-ground-theta.vercel.app.

## Run it locally

From `site/` (Node 20+, no installs):

- `npm run dev` → http://localhost:3000 with real accounts on a fresh in-memory database. "Continue with Google"
  opens a local sign-in instead: type any name to be that person. Use a private window to be a second person.
- `npm test` → the permission tests (invites, kicking, revoking, removing companies, settings, muting, deleting).
- Design only: any static server works (`python3 -m http.server 8091 --directory site`); pages fall back to the
  seeded in-browser demo. On the live site, add `?demo`: `/dashboard/?demo`, `/signin/?demo`.

## Pages

| Path | What it is | Files |
|---|---|---|
| `/` | Overview: the film, the standard, "Who gets it?" | `index.html`, `site.css`, `site.js`, `gate.js`, `film/` |
| `/signin/` | Sign in | `signin/` |
| `/join/` | Join as an individual, a portfolio company or a fund | `join/` |
| `/dashboard/` | The VS Code-style workbench, signed in only | `dashboard/live.js` (real accounts), `dashboard/app.js` (demo), `dashboard/app.css` |

## Changing the design

- **Colours, type, spacing:** the tokens at the top of `base.css` (`--bg`, `--fg`, `--accent`, `--font`, `--mono`, …)
  apply to every page. The dashboard's VS Code palette is the `--v*` block at the top of `dashboard/app.css`.
- **Logo:** `logo.svg`, used everywhere as an image (top bar, tab icon, dashboard, film). Replace the file to change it.
- **The film:** each scene is HTML in `index.html` (inside `<section class="film">`) styled by `film/section.css`;
  timing is the step list in `film/script.js` (`?t=12.5` in the address freezes any moment). The engine in `tour/`
  is shared and shouldn't need edits.
- **Lil guys:** `film/lilguy.js` draws a person from a GitHub handle (skin, hair, shirt, glasses). Change the palettes
  at the top of that file.
- **Favicons:** `film/favicons/`, each company's own, from its website.

## Data

Live: `api/index.js` (one Vercel function; routes, permissions, Redis key layout at the top), `api/_auth.js` (Google
sign-in, signed session cookie), `api/_kv.js` (Upstash REST). The browser side calls it through `api.js`.
Demo: `store.js` holds the seeded state in the browser; `dashboard/app.js`, `signin/signin.js`, `join/join.js` use it.

## Accounts (live)

The deployed site runs on real accounts: Google sign-in, Upstash Redis on Vercel, one serverless function at `api/index.js`.
`api.js` checks `/api/status`; when the database and Google are both connected, the sign-in, join and dashboard pages load
their `live.js`. Otherwise (or with `?demo` in the URL) they run on the seeded demo in your browser, so design work
needs no backend: `/dashboard/?demo`, `/signin/?demo`.

- Invite links: every circle, company and fund has one reusable link (`/join/?invite=…`); funds have a second for companies.
- Admins can change roles, remove people, turn links off, remove companies from a fund, revoke shares and remove tools.
  Every read re-checks permissions, so those take effect immediately.
- Env vars: `SESSION_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`.

## Deploying and accounts

- Deploy: `vercel deploy --prod --yes` from `site/`. Pushing to GitHub does not deploy yet; the Vercel project
  (`common-ground`) is on Connor's Vercel account, so ask Connor to deploy or to add you to it.
- Google sign-in client: Connor's Google Cloud project. Its only redirect URI is
  `https://common-ground-theta.vercel.app/api/auth/callback`; a new domain needs adding there.
- Database: Upstash Redis (free), connected through Vercel Storage. HydraDB can replace it later behind `api/_kv.js`.

## Not done yet

- Tools are added by hand in the dashboard ("Add a tool…"); the VS Code extension doesn't publish to or read from
  this API yet.
- No email or Slack notifications; invite links are copied and sent by hand.
- Live sharing has been tested with local test users only; a second real person still needs to try invites,
  kicking and revoking on the live site.
