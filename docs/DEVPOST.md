# Devpost submission: Common Ground

EVOLVE 2026 hackathon by 8090. Theme: build your own Software Factory. Team: Connor Hood and Anushka ([0xANUSHKA](https://github.com/0xANUSHKA)).
Paste each section into the matching Devpost field. Built with lists only what ran live (HydraDB and the Vercel AI Gateway are wired but weren't live).

---

## Project name

Common Ground

## Tagline

An ontological software factory for venture portfolios: agents build tools against the fund's shared data standard, so a tool checked at one company runs at the next.

Spoken version: "One software factory for the whole portfolio."

---

## What it does

Common Ground is an ontological software factory for venture portfolios. Agents build tools against the fund's shared data standard, not one company's columns, so any tool that passes the factory's checks can run at every company that has mapped its data.

Here's the line, from idea to implementation:
1. An engineer describes a tool in VS Code or Cursor.
2. The brief and its execution contract are filed as a FEATURE requirements document in 8090's Software Factory, through its external API, before any code is written.
3. A coding agent writes the tool against one fixed contract: a single function, `inspect(rows, binding)`, that only ever sees the standard's `time` and `value` fields.
4. Seven checks the agent cannot edit run the tool in a sandbox on real NOAA ocean data and NREL solar data. Failures go back to the agent for repair, up to three attempts.
5. The version that passes is sealed by its SHA-256 hash.
6. The engineer shares that exact version with named people at other portfolio companies.
7. When they open it, the checked code arrives byte-identical. Only the binding changes, to their own company's mapping.

**Mapped to the theme**
- **Idea to implementation:** brief, 8090 requirement, agent build, independent checks, sealed version, delivered to the next permitted engineer.
- **The organization's context:** the fund's shared ontology. It is one data standard (Sensor time-series v1: time, value, unit, time basis, cadence), plus each company's mapping of its own columns to that standard, plus the people and permissions that say where a tool may go. A single company's factory has its own codebase as context. A portfolio's factory has the standard every company has agreed to.
- **Shared memory across companies:** the registry of checked tools. Each one keeps its author, company, hash, checks, build-hour estimate, recipients and reuse history. The next engineer starts from a checked tool instead of a blank file.

**The seven checks**
1. NOAA ocean sample: 1,440 rows, 55 missing wind values
2. NREL solar sample: 1,440 rows, negative power kept
3. Finds three missing timestamps and one duplicate
4. Finds missing first and last observations
5. Zero is a reading; malformed is separate
6. Rejects a wrong units-row assumption (which would silently keep 1,439 of 1,440 rows)
7. Unseen window with duplicates and off-grid rows

**For the fund, the buyer.** A fund signs up with Google and sends one link to its portfolio. Each company sends one link to its engineers. There is no individual plan. The fund's console shows:
- the portfolio companies and where each is in mapping its data
- every tool shared across the portfolio
- each reuse event, with estimated hours saved (reuses times the author's own build estimate)
- the people involved

The fund also sets the outer limits: network on or off, cross-company sharing on or off, a cap on unopened offers per person (1 to 5), share expiry (1 to 90 days, default 7), named recipients only (always on) and no onward resharing (always off). The fund can see what is shared and reused, but it cannot download a company's code.

**For a company: control.** A company maps its data once. The sample is checked in the browser, and nothing is uploaded. Admins set three permissions per person (can share, can share across the portfolio, receives). They can remove people, turn invite links off, choose to receive from nobody, the company only or the portfolio, and pick which portfolio companies to receive from. No tool crosses into or out of a company until it is mapped.

**For the engineer: the factory, inside the editor.** Recipients see a shared tool in their Start view, marked with the sender's company. Opening it verifies the hash and saves the files into a fresh folder. Nothing runs on download. Revoking the share, removing the person, or the company leaving the fund stops future access on the next request.

**Why a fund pays for it**
- **One factory instead of forty.** A factory per company rebuilds the same tool at every company. A factory per portfolio builds it once, and every portfolio engineer's agent output becomes a fund-level asset.
- **A reuse ledger.** Tools reused, by which companies, and the estimated hours saved. That's a number a platform team can report.
- **A boundary companies accept.** Named people, one exact version, expiry, no resharing, company opt-in and personal opt-out. Every read re-checks permission.

## Inspiration

Companies that innovate quickly produce bespoke tools constantly, and agents have made that faster still. Most of those tools never reach their potential. They aren't bad; nobody else knows they exist, and nobody is primed to adapt them. It's a communication and distribution problem. Solve it and a lot of reinventing the wheel goes away, and value turns up that nobody knew was there.

That holds inside one company. It holds even more across friendly companies, and the most natural group of friendly companies is a venture portfolio. A fund can establish its companies on a single shared ontology, a standard their data maps to, so breakthroughs, understanding and code can pass between them. That only works if two things are true. The ontology has to exist, and the factory has to sit where developers are actually innovating, which is the IDE. 8090's idea of a software factory is a production system that answers for its output. We wanted to see what that looks like when the factory spans companies with a common owner.

## How we built it

- **The factory (Node, Fastify, SQLite, runs on the engineer's machine):**
  - **8090 Software Factory API:** each build writes a FEATURE requirement containing the brief and the execution contract. Only the brief and contract are sent, never repo contents.
  - **Coding agent:** Claude Code in headless mode (`claude -p`) writes the function from the brief and the contract. The factory runs the seven checks on whatever it returns and sends the failing checks back for repair, up to three attempts (`BUILD_PROVIDER=claude`). Verified live: from the default brief, Claude Code wrote a 120-line inspector in 36 seconds. It passed all seven independent checks on the first attempt, and the artifact is labeled `agent-generated`. An Eve worker through the Vercel AI Gateway is also wired. A hand-authored reference template remains as a fallback, labeled as such in the editor.
  - **Sandbox:** QuickJS compiled to WebAssembly, with a 32 MB memory cap, an 800 ms deadline, and no filesystem, network, imports or host APIs. The checks live outside the generated code, and only passing code becomes a hashed artifact.
- **Hosted service on Vercel:** a static site and one Vercel serverless function for every route (accounts, funds, companies, invites, roles, the standard, sharing, packages, reuse). Data lives in Upstash Redis, and sign-in is Google OAuth with a signed session cookie.
- **The gate on the hosted side:** publishing requires all seven checks to pass. A tool registered by hand has zero checks and can't be shared.
- **Permissions on every read:** each request recomputes whether a share still reaches the person. It checks that the grant is live and unexpired, both companies are in the same fund and mapped, the fund allows cross-company sharing, the receiving company accepts tools from that sender, and the person receives.
- **Rebinding on delivery:** when someone at another company downloads a tool, the service replaces `binding.json` with their company's own mapping of the standard. `inspector.js` stays byte-identical, so the hash still verifies. Recipients get a README line: "Rebound to Palmetto's mapping of Sensor time-series v1. Core hash unchanged."
- **VS Code / Cursor extension (TypeScript):**
  - Sign-in goes through the browser, then back to `vscode://` or `cursor://` with a token and a one-time state value.
  - The webview Start view uses the editor's own theme and can call only allowlisted routes.
  - Downloads accept only flat file names, verify the hash, write into a brand-new folder and require a trusted workspace.
- **ElevenLabs Scribe:** the factory's API (`/api/audio-brief`) transcribes a recorded brief, for example the meeting where someone asked for the tool, with Scribe v2. The transcript becomes an editable spec before building. Voice never grants permission to share. In the editor's Build view, "use a recording…" puts the transcript into the brief box for the engineer to edit before building. A real transcription succeeded.
- **HydraDB:** an adapter queries company-scoped context collections for evidence that a tool fits a recipient. Collections are chosen by server policy, after access checks, and HydraDB never decides access. It isn't connected to a live database yet, so the factory falls back to local public evidence.

## Challenges we ran into

- **Making a tool portable for real.** Tools only see the standard's fields, and the binding carries each company's columns, units-row setting, time basis and cadence. The hard cases were real data: negative solar power at night, zero versus missing, and a units-row assumption that silently drops the midnight reading. We never guess a timezone.
- **Two halves of one factory.** Building and checking have to happen on the engineer's machine, in a real sandbox. Accounts and delivery have to be hosted. The hosted service re-verifies the hash and accepts a package only with all seven checks passing. A tool registered by hand in the console has zero checks and can't be shared. The service doesn't re-run the checks itself yet.
- **Live generation.** Our first agent path, Eve through the Vercel AI Gateway, returned `403 customer_verification_required` overnight. We added Claude Code, running headless, as a second agent behind the same independent checks rather than faking a build. It passed all seven checks on its first live run.
- **Revocation that takes effect on the next request, on a key-value store.** We laid out the Redis keys so every read recomputes access cheaply.
- **Not overclaiming impact.** "Hours saved" is an estimate, labeled as one, and each person's reuse is counted once.

## Accomplishments that we're proud of

- The factory line runs end to end: brief, 8090 requirement, agent build (Claude Code, 36 seconds, seven of seven on the first attempt), seven independent checks, sealed hash, a named share to another portfolio company, delivery into that engineer's editor rebound to their mapping, and the reuse counted for the fund.
- Accounts, sharing, revocation, delivery and reuse counting run on a public URL with real Google sign-in. Building and the seven checks run in the local factory.
- The project has 9 factory tests and 46 hosted permission checks. The permission checks cover invites, kicking, revoking, removing companies, fund and company policy, receiving off, rejected hashes and file names, and outsiders denied downloads.
- "Explore a demo fund" creates a private sandbox in one click: five companies, five tools, seven reuses, about 106 estimated hours.

## What we learned

- With agents, building is cheap. What's expensive is everything after: knowing a tool exists, that it fits, that it's correct, and who may have it. That's the part a factory has to guarantee.
- A factory's context decides how far its output can travel. A codebase reaches one company. A shared ontology reaches a portfolio.
- The fund is the one party that can set a standard across companies that would otherwise never agree on a schema. Each company keeps control of what leaves and what arrives.
- The factory has to live in the editor. The console is for the people measuring; the editor is for the people building.

## What's next

- Store the 8090 requirement ID in each tool's provenance, so a tool downloaded at Palmetto links back to its requirement in 8090.
- Re-run the seven checks on the server at publish time.
- Before building, check the registry: "Saildrone already built this against the standard. Open it instead?"
- Feed more organizational context into the factory: tickets, past sessions and meeting transcripts, all consented and company-scoped, meeting at the same ontology.
- More standards and tool contracts beyond Sensor time-series v1, and versioned updates that re-check and re-offer.
- Company SSO, plus a pilot with one fund platform team and two of its companies.

## Built with

javascript, typescript, node.js, vercel, vercel-functions, upstash, redis, google-oauth, vscode-extension-api, cursor, claude-code, quickjs, webassembly, fastify, sqlite, zod, 8090-software-factory, elevenlabs, eve

## Try it

- **Live site:** https://common-ground-theta.vercel.app
- **Fund console in one click:** https://common-ground-theta.vercel.app/signin/, then **Explore a demo fund**. This creates a private sandbox with sample data.
- **Set up a real fund:** https://common-ground-theta.vercel.app/join/
- **Extension for VS Code and Cursor:** https://common-ground-theta.vercel.app/download/common-ground.vsix. Install it from the Extensions view (... > Install from VSIX); Start opens on first run. Receiving needs only the extension. Building and checking also need the local factory: clone the repo and run `npm ci && npm start` (Node 26, with `BUILD_PROVIDER=claude` for the live agent).
- **Tip:** open the demo fund in your browser, then sign in from the extension, and Start lists the demo's shared tools.
- **Code:** https://github.com/0xANUSHKA/common-ground-8090

**What's real and what's sample.**
- **Real on the live site:** accounts, funds, companies, invites, roles, sharing, revocation, package delivery and reuse counting.
- **Verified with live calls:** 8090 requirement recording, ElevenLabs transcription, and a Claude Code agent build passing all seven checks.
- **Sample data:** the demo fund (named Social Capital, with Saildrone, Palmetto, Mast Reforestation, Groq and Netskope). Its relationships are illustrative and say nothing about real holdings. Its companies map their real column shapes (Saildrone: `time` / `WIND_SPEED_MEAN`, UTC, with a units row; Palmetto: `measured_on` / `ac_power__423`, local time). Its tools are telemetry-inspector, glider-feed-qc, pv-gap-finder, inverter-gap-report and canopy-sensor-qa.
- **Public data:** the NOAA and NREL datasets. The solar data stands in for Palmetto's; it is not Palmetto customer data.
- **Estimated:** "Hours saved".
