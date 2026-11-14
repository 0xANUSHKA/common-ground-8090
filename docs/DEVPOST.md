# Devpost submission: Common Ground

EVOLVE 2026 hackathon by 8090. Team: Connor Hood and Anushka ([0xANUSHKA](https://github.com/0xANUSHKA)).
Paste each section into the matching Devpost field. Items in [brackets] need a decision before you submit.

---

## Project name

Common Ground

## Tagline

A shared data standard for a venture portfolio, plus an IDE extension that hands a checked tool from one portfolio company's engineer to another's.

Shorter alternative: Tools built at one portfolio company, reused at the next, from inside the editor.

---

## Inspiration

Companies that move fast build bespoke tools all the time. An engineer and their agent spend an afternoon on a data checker, a dashboard or a converter. It works, it gets used once or twice, and it stays on one laptop. Meanwhile the team down the hall, or the company next door, builds the same thing again.

The tools are fine. The problem is communication and distribution. If people knew a tool existed, and were set up to adapt it to their own case, a lot of rebuilding would stop and some unexpected value would turn up.

That holds inside one company. It holds even more across friendly companies, and the most natural group of friendly companies is a venture portfolio. That's where the fund comes in. A fund can put its companies on one shared ontology: a standard their data maps to. Once that exists, companies can pass breakthroughs, understanding and code to each other. It only works if two things are true: the shared standard exists, and there is a feature that sits where developers are actually building, which is the IDE.

Common Ground is both of those things.

## What it does

Distribution starts with the fund. A fund signs up with Google and gets one link, which it sends to its portfolio companies. Each company sends its own link to its engineers. There is no individual plan.

**For the fund: a console.** The fund sees its portfolio companies, where each one is in mapping its data to the standard, every tool shared across the portfolio, each reuse event, and an estimate of the hours those reuses saved. It also sees the people involved and sets the sharing policy:
- network on or off for the whole portfolio
- cross-company sharing on or off
- a cap on unopened offers per person (1 to 5)
- share expiry (1 to 90 days, default 7)
- named recipients only (always on: a tool never goes to a whole outside company)
- no onward resharing (always off: only the author shares a tool)

The fund can see what's shared and reused. It cannot download a company's code unless someone shares it with them.

**For a company: control over its own people.** Company admins set roles and three permissions per person: can share with the team, can share across the portfolio, receives tools. They can remove people, turn invite links off, choose whether to receive from nobody, the company only, or the portfolio, and pick which portfolio companies they'll receive from. They also map their data to the fund's standard (Sensor time-series v1: time, value, unit, time basis, cadence). The sample is checked in the browser, and nothing is uploaded. A company has to be mapped before tools can cross into or out of it.

**For an engineer: an extension for VS Code and Cursor.** The extension adds a Start view and signs in through the browser. When a tool is finished, a local builder runs seven checks on it in a sandbox, against public NOAA ocean data and NREL solar data:
1. NOAA ocean sample: 1,440 rows, 55 missing wind values
2. NREL solar sample: 1,440 rows, negative power kept
3. Finds three missing timestamps and one duplicate
4. Finds missing first and last observations
5. Zero is a reading; malformed is separate
6. Rejects a wrong units-row assumption
7. Unseen window with duplicates and off-grid rows

Only the exact checked version can be shared, identified by its SHA-256 hash. It goes to the engineer's team or to named people at other portfolio companies. Recipients see it in their Start view, marked with the sender's company. Opening it verifies the hash and saves the files into a fresh folder. Nothing runs on download. If the share is revoked, or the person is removed, or the company leaves the fund, future access stops immediately. Copies already saved stay with the person who saved them.

**Why it matters to a fund**
- **Engineering leverage across the portfolio.** One company's tool becomes every company's starting point, without a shared repo or a marketplace nobody browses.
- **Reuse you can measure.** Every download or adaptation by a permitted person is counted once per person, so a platform team can point to tools reused and estimated hours saved per company.
- **A permission boundary companies will accept.** Named people, one exact version, expiry, no resharing, company opt-in and personal opt-out. Every read re-checks permission.

## How we built it

- **Hosted service:** a static site (plain HTML, CSS and ES modules, no build step) and one Vercel function that handles every route: accounts, funds, companies, invites, roles, the standard, sharing, packages and reuse. Data lives in Upstash Redis. Sign-in is Google OAuth with a signed session cookie.
- **Permissions on every read:** we don't cache who can see what. Each request recomputes whether a share still reaches the person: the grant hasn't been revoked or expired, both companies are still in the same fund and mapped, the fund allows cross-company sharing, the receiving company accepts portfolio tools from that sender, and the person still receives.
- **Editor sign-in:** the extension opens the browser, the user signs in with Google, and the service redirects back to `vscode://` (or `cursor://`) with a token and a one-time state value. The token is kept in the editor's SecretStorage.
- **VS Code extension (TypeScript):** a webview Start view styled with the editor's own theme variables. It talks only to an allowlist of routes. Downloads accept a fixed set of flat file names, verify the hash, write into a new folder that must not already exist, and require a trusted workspace.
- **Local builder (Node, Fastify, SQLite):** builds a tool against a fixed contract, `inspect(rows, binding)`, and runs it in QuickJS compiled to WebAssembly. The sandbox has a 32 MB memory cap, an 800 ms deadline per run, and no filesystem, network, imports or host APIs. The seven checks run outside the generated code, and a tool that fails any of them can't be shared. Each build brief is recorded as a requirements document through the 8090 Software Factory API.
- **The overview film:** a scripted, frame-addressable animation of the whole flow that plays on the landing page.

## Challenges we ran into

- **Revocation that takes effect immediately, without a relational database.** We designed the Redis key layout so every read can cheaply recompute access. Removing a person, a company or a share works on the next request.
- **Two backends, one experience.** Checking code has to happen on the engineer's machine, inside a real sandbox. Accounts and sharing have to be hosted. The extension bridges the two. The hosted service re-verifies the package hash and refuses packages that report a failed check, but today it doesn't re-run the checks itself.
- **Data that looks wrong but isn't.** Negative solar power is real at night. Zero is a reading, not a gap. Assuming the solar file has a units row silently drops the midnight reading (1,439 rows instead of 1,440). The checks were written to catch exactly these mistakes, and the builder never guesses a timezone.
- **Not overclaiming.** "Hours saved" is an estimate: reuses multiplied by the author's own estimate of build time. We count downloads and adaptations, once per person, and we label the result as an estimate.
- **Live agent generation.** The path for an agent to generate a tool (Eve through the Vercel AI Gateway) is wired, but [we did not get a verified end-to-end live run before the deadline / update if one succeeds]. The builder labels which mode produced each tool, and the demo uses the clearly labeled reference build rather than pretending.

## Accomplishments that we're proud of

- The whole loop works on a public URL with real Google sign-in: a fund sets up, a company joins and maps its data, an engineer shares a checked tool with a named person at another company, that person opens it in their editor, and the fund sees the reuse.
- 41 automated permission tests against the hosted API pass. They cover invites, kicking, revoking, removing companies, fund and company settings, receiving off, rejected hashes and file names, outsiders being denied downloads, and the demo seed. The local builder has its own policy and execution tests.
- Anyone can try it in one click. "Explore a demo fund" creates a private sandbox fund with five companies, their people, five tools and seven reuses.
- Nothing runs on download, and the hash is checked on the way up and again on the way down.

## What we learned

- Building the tool is the easy part now. The hard part is the boundary: who is allowed to receive it, and making that boundary visible and adjustable by the people who own it.
- The fund is the right place to start. It already has the relationships and the incentive, and it can set a standard. Companies still keep control over what leaves and what arrives.
- Without the standard, reuse doesn't happen. A tool from an ocean-drone company means nothing to a solar company until both map their data to the same shape.
- Distribution has to live in the editor. Dashboards suit the people measuring reuse. The people doing the building need the tool to show up where they work.

## What's next

- Re-run the seven checks on the server when a tool is published, rather than trusting the local builder's report.
- Company SSO, verified organization identity, and independent approval from the exporting company.
- More standards and more tool contracts beyond Sensor time-series v1 and `inspect(rows, binding)`.
- Versioning: new versions reviewed again, and recipients told when an update is available.
- Notifications. Invite links are copied and sent by hand today.
- A verified live agent-generation path.
- A pilot with one fund platform team and two of its companies, measuring accepted shares, real reuse, false positives and verified time saved.

## Built with

javascript, typescript, node.js, vercel, upstash, redis, google-oauth, vscode-extension-api, cursor, quickjs, webassembly, fastify, sqlite, zod, esbuild, vite, 8090-software-factory, eve, vercel-ai-gateway

## Try it

- **Live site:** https://common-ground-theta.vercel.app
- **Fastest look at the fund console:** https://common-ground-theta.vercel.app/signin/, then click **Explore a demo fund**. This creates a private sandbox fund, with sample data, that is yours to change.
- **Set up a real fund:** https://common-ground-theta.vercel.app/join/
- **VS Code / Cursor extension:** https://common-ground-theta.vercel.app/download/common-ground.vsix. Install it from the Extensions view (... > Install from VSIX), or run `code --install-extension common-ground.vsix`. Start opens on first run, or you can run **Common Ground: Open Start**. Receiving tools works with only the extension. Building and checking a tool also needs the local builder: clone the repo and run `npm ci && npm start` (Node 26).
- **Tip:** if you open the demo fund in your browser first and then sign in from the extension, Start shows the demo's shared tools. Sample tools have no files to download.
- **Code:** https://github.com/0xANUSHKA/common-ground-8090

**What's real and what's sample.** Accounts, funds, companies, invites, roles, sharing, revocation, package transfer and reuse counting are real on the live site. The demo fund (named Social Capital, with Saildrone, Palmetto, Mast Reforestation, Groq and Netskope) is sample data. Its company relationships and people are illustrative and say nothing about real holdings or partnerships. The NOAA and NREL datasets are public. The NREL solar data is not Palmetto customer data. "Hours saved" is an estimate.
