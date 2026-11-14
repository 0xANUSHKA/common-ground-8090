# Common Ground site

The public site, sign-in and dashboard. Plain HTML, CSS and ES modules: no build step. Live at
https://common-ground-theta.vercel.app.

## Run it locally

From `site/` (Node 20+, no installs):

- `npm run dev` → http://localhost:3000 with real accounts on a fresh in-memory database. "Continue with Google"
  opens a local sign-in instead: type any name to be that person. Use a private window to be a second person.
- `npm test` → the permission tests (invites, kicking, revoking, removing companies, settings, muting, deleting).
- "Explore a demo fund" on the sign-in page makes a private sandbox fund (five companies, people, tools, reuse) and
  signs you in as its owner: the quickest way to see every screen, locally or live.

## Pages

| Path | What it is | Files |
|---|---|---|
| `/` | Overview: the film, the standard, "Who gets it?" | `index.html`, `site.css`, `site.js`, `gate.js`, `film/` |
| `/signin/` | Google sign-in, or a private demo fund | `signin/live.js` |
| `/join/` | A fund sets itself up; `?invite=` joins a fund or a company | `join/live.js` |
| `/dashboard/` | The console: a fund runs its portfolio, a company runs its team | `dashboard/console.js`, `dashboard/console.css` |

## Changing the design

- **Colours, type, spacing:** the tokens at the top of `base.css` (`--bg`, `--fg`, `--accent`, `--font`, `--mono`, …)
  apply to the public pages. The console has its own `--c-*` tokens at the top of `dashboard/console.css`, light and
  dark.
- **Logo:** `logo.svg`, used everywhere as an image (top bar, tab icon, dashboard, film). Replace the file to change it.
- **The film:** each scene is HTML in `index.html` (inside `<section class="film">`) styled by `film/section.css`;
  timing is the step list in `film/script.js` (`?t=12.5` in the address freezes any moment). The engine in `tour/`
  is shared and shouldn't need edits.
- **Lil guys:** `film/lilguy.js` draws a person from a GitHub handle (skin, hair, shirt, glasses). Change the palettes
  at the top of that file.
- **Favicons:** `film/favicons/`, each company's own, from its website.

## Data

`api/index.js` (one Vercel function: routes, permissions, the demo fund, Redis key layout at the top), `api/_auth.js`
(Google sign-in, signed session cookie), `api/_kv.js` (Upstash REST). The browser calls it through `api.js`.

## Accounts

Funds and their portfolio companies; there is no individual plan. A fund sets itself up at `/join/`, sends its one
company link to the portfolio, and each company sends its own link to its engineers.

- Invite links: every company and fund has a reusable team link (`/join/?invite=…`); funds have a second for companies.
- Admins can change roles, remove people, turn links off, remove companies from a fund, revoke shares and remove tools.
  Every read re-checks permissions, so those take effect immediately.
- Env vars: `SESSION_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`.

## The editor extension

`extension/` and `web/` (repo root). It signs in through the browser (`GET /api/auth/extension` → Google → a
`vscode://common-ground-demo.common-ground/auth?token=…` link back) and then talks to this API with a Bearer token.
Building and the seven checks run in the local builder (`npm start` at the repo root, Node 26); sharing, receiving and
downloads go through Common Ground: `POST /api/tools` with the checked files (hash-verified), `POST
/api/tools/:id/grants`, `GET /api/shared`, `GET /api/tools/:id/package`. Rebuild with `npm run package:extension`
and copy the `.vsix` to `site/download/common-ground.vsix` so the site serves the new one.

## Deploying and accounts

- Deploy: `vercel deploy --prod --yes` from `site/`. Pushing to GitHub does not deploy yet; the Vercel project
  (`common-ground`) is on Connor's Vercel account, so ask Connor to deploy or to add you to it.
- Google sign-in client: Connor's Google Cloud project. Its only redirect URI is
  `https://common-ground-theta.vercel.app/api/auth/callback`; a new domain needs adding there.
- Database: Upstash Redis (free), connected through Vercel Storage. HydraDB can replace it later behind `api/_kv.js`.

## Not done yet

- Reuse is counted when someone downloads or adapts a tool (`POST /api/tools/:id/uses`); "hours saved" is reuses times
  the author's build estimate.
- No email or Slack notifications; invite links are copied and sent by hand.
- Live sharing has been tested with local test users only; a second real person still needs to try invites,
  kicking and revoking on the live site.
