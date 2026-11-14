# Common Ground site

The public site, sign-in and dashboard. Plain HTML, CSS and ES modules: no build step. Serve the folder with any
static server (`python3 -m http.server 8091 --directory site`) or deploy it to Vercel with this folder as the root.

## Pages

| Path | What it is | Files |
|---|---|---|
| `/` | Overview: the film, the standard, "Who gets it?" | `index.html`, `site.css`, `site.js`, `gate.js`, `film/` |
| `/signin/` | Sign in | `signin/` |
| `/join/` | Join as an individual, a portfolio company or a fund | `join/` |
| `/dashboard/` | The VS Code-style workbench, signed in only | `dashboard/app.js`, `dashboard/app.css` |

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

`store.js` holds the shared state and the signed-in session. The live deployment moves accounts, orgs, invites,
members and grants to the server (`api/`); until then the prototype keeps them in the browser.
