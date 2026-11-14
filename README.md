# Common Ground

**Your software factory finished a tool. Someone else in your portfolio needed it yesterday.**

Common Ground is an ontological software factory for venture portfolios. Agents build tools against the fund's shared data standard rather than one company's columns, so any tool that passes the factory's checks can run at every company that has mapped its data. A fund sets the standard and sends one link to its portfolio. Each company maps its data once. Engineers build, check and share tools from VS Code or Cursor, and the fund's console shows recorded reuse alongside author-supplied build estimates. The current factory builds one bounded telemetry-checking function; arbitrary repositories are not supported.

Built for EVOLVE (8090), November 13–14, 2026. MIT licensed. The demo fund is sample data with illustrative companies and people. The datasets are public NOAA and NREL data.

## Try it

- **Live site:** https://common-ground-theta.vercel.app
- **Fund console in one click:** https://common-ground-theta.vercel.app/signin/, then **Explore a demo fund**. This creates a private sandbox fund with sample data, signed in as its owner.
- **Set up a real fund:** https://common-ground-theta.vercel.app/join/ (Google sign-in)
- **VS Code / Cursor extension:** https://common-ground-theta.vercel.app/download/common-ground.vsix. Install it from VSIX; Start opens on first run, or run **Common Ground: Open Start**. Receiving tools needs only the extension. Building needs the local factory (below).

## The factory line

1. **Brief.** An engineer describes a tool in the extension's Build view. The brief can be typed or come from a recording, which ElevenLabs Scribe transcribes into an editable brief.
2. **Requirement.** The brief and its execution contract are filed as a FEATURE requirement in 8090's Software Factory through its external API.
3. **Agent builds.** A coding agent writes one function, `inspect(rows, binding)`, against the standard. It sees only `time` and `value`, never one company's columns. With `BUILD_PROVIDER=claude` this is Claude Code running headless.
4. **Seven checks.** The function runs in a QuickJS/WebAssembly sandbox (32 MB, 800 ms, no filesystem, network or imports) on real NOAA ocean and NREL solar data. The agent can't edit the checks. Failures go back to it for repair, up to three attempts.
5. **Sealed.** The version that passes becomes an immutable artifact, identified by the SHA-256 hash of its source, binding and check record.
6. **Shared by name.** The engineer shares that exact version with their team or with named people at other portfolio companies, within the fund's and both companies' rules.
7. **Rebound and counted.** The recipient opens it in their editor. `inspector.js` arrives byte-identical, `binding.json` is replaced with their company's own mapping, and nothing runs on download. The fund's console counts the reuse.

## Recipient execution demo (extension 0.1.1)

After saving a shared tool, open Start and click **Run on solar sample** under **Opened from Common Ground**.
It executes the actual downloaded source, checks its hash against the receipt, and uses the saved solar mapping.
The extension bundles QuickJS and the public NREL sample: no local builder or model key is needed.
The report compares the original data with a copy containing three intentionally removed observations and one duplicate.
Source, binding and data files are not modified. This supports the known solar sample contract, not arbitrary CSVs.

## Run it

**Hosted site and API** (`site/`): the static site, sign-in, join flow, console and one Vercel function. To run it locally with an in-memory database, use `cd site && npm run dev`. See [site/README.md](site/README.md) for pages, data layout, deploying and environment variables.

**Local factory** (the builder the extension calls for Build): Node **26.x** (built-in SQLite) and npm.

```sh
npm ci
cp .env.example .env
npm run check
npm run builder:start            # http://127.0.0.1:4317, loopback only
```

Choose the build agent in `.env`:
- `BUILD_PROVIDER=claude`: a live agent build through headless Claude Code (`claude` must be on PATH and signed in; `CLAUDE_BIN` overrides the path).
- `BUILD_PROVIDER=reference`: the hand-authored offline template, labeled as such in the editor.
- `BUILD_PROVIDER=eve`: the Eve worker through the Vercel AI Gateway (`npm run agent:dev`).

Optional keys: `SOFTWARE_FACTORY_API_KEY` (8090 requirements), `ELEVENLABS_API_KEY` (audio brief), `HYDRADB_API_KEY`. See [docs/SETUP.md](docs/SETUP.md).

**Extension:**

```sh
npm run package:extension
code --install-extension common-ground-0.1.1.vsix     # or: cursor --install-extension …
```

The extension signs in to the hosted service through the browser. It requires workspace trust before building or downloading, and never installs dependencies or runs downloaded code.

## Onboarding and recommendations

Fund admins choose company-only or cross-company sharing and invite company admins. Company admins map a sample, write a short **shared workflow brief**, and grant Publisher/Exporter roles selectively. Engineers sign into the extension with the same account. The console's **Get started** checklist explains each handoff.

Recommendations cite words from the destination company's shared brief or a person's recorded reuse. Current membership, company policy, publisher/exporter roles and personal receiving preferences are checked before candidates are returned. A compatible schema alone is insufficient; the service may recommend nobody. This is an explainable deterministic matcher, not inferred knowledge of every employee's work.

The extension polls approved shares every 15 seconds. Initial sign-in stays quiet; subsequent new versions produce one native editor notification when Start is hidden. Disable it with `commonGround.notifications`. No code is automatically downloaded or executed. A changed service URL requires signing in again.

## Architecture

- **Hosted service:** a static site plus one Vercel function (`site/api/index.js`), on Upstash Redis, with Google OAuth sign-in. It handles funds, companies, invites, roles, the standard and company mappings, sharing policy, grants, package delivery with rebinding, and reuse counts. Every read re-checks permission.
- **Local factory:** Fastify and SQLite on loopback (`server/`). It records the 8090 requirement, runs the build agent, runs the independent verifier in QuickJS/WebAssembly (`server/runner.ts`), and produces hashed artifacts.
- **Extension:** a TypeScript webview Start view (`extension/`, `web/`). It builds through the local factory and publishes the checked package to the hosted service, which re-verifies the hash and refuses anything without all seven checks passing. It receives shared tools, verifies the hash and writes them into a fresh folder.

More detail: [architecture and limitations](docs/ARCHITECTURE.md), [product brief](docs/PRODUCT_BRIEF.md), [Devpost write-up](docs/DEVPOST.md), [demo plans](docs/DEMO-VIDEO.md), [data licenses](fixtures/DATA_LICENSES.md).

## Integrations

| Service | Implemented role | Status | Setup |
|---|---|---|---|
| 8090 Software Factory | Records a FEATURE requirements document for each build brief and execution contract | Live call verified | `SOFTWARE_FACTORY_API_KEY` |
| Claude Code (headless) | Live build agent: writes the function, gets back the failing checks, repairs (up to 3 attempts) | Verified here: generated source, repair, 7/7 checks and recipient fault challenge (14 Nov) | `BUILD_PROVIDER=claude` |
| ElevenLabs Scribe | Audio brief → editable transcript → build. Never grants sharing permission by voice. | Live call verified | `ELEVENLABS_API_KEY`, then **use a recording…** in Build |
| Vercel | Hosting and the API function | Live | `site/`, `vercel deploy --prod` |
| Eve + Vercel AI Gateway | Alternative live agent: generates source, calls `submit_candidate`, repairs on failures | Wired; Gateway blocked by billing verification | `AI_GATEWAY_API_KEY`, `BUILD_PROVIDER=eve`, `npm run agent:dev` |
| HydraDB v2 | Company-scoped context collections for fit evidence; queried only after policy selects eligible collections | Live ingestion/retrieval verified locally; hosted workflow retrieval needs deployment credentials | `HYDRADB_API_KEY`, `HYDRADB_DATABASE` (use the existing database; this workspace uses `default-tenant`) |

Keys are server-only, in the ignored `.env`. Never put them in the webview, source, screenshots or Git. A configured key doesn't imply a successful live call, and the offline template stays plainly labeled. 8090's external API records the requirement; Common Ground's factory executes the build and the checks. Composio has no role.

## Permission boundary

```text
fund network on + cross-company sharing on (for portfolio shares)
  ∩ author is Publisher (team) / Exporter (across the portfolio)
  ∩ exact version, all seven checks passed, hash verified
  ∩ grant: named people only, expiry, no onward resharing
  ∩ both companies in the same fund and mapped to the standard
  ∩ destination company participating, receives from the portfolio, allows this sender
  ∩ recipient still a member with Receives on, and not muted or opted out
  → shown in their Start view; package downloadable
```

The hosted API recomputes this **on every read**: listing, opening a tool, and downloading a package. Removing a person, removing a company from the fund, revoking a grant, or switching receiving off takes effect on the next request. The fund can see what is shared and reused, but it can't download a company's code. A tool registered by hand in the console has zero checks and can't be shared. No model or voice input can add a recipient, edit a grant or mark checks passed. Revocation stops future access, but it can't erase files someone already saved.

Not yet built: company SSO and verified organization identity, independent export approval by the source company, server-side re-running of checks at publish, version update delivery and signed package attestations. Editor notifications for newly shared versions are implemented; Slack/email delivery is not. See [ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Checks

16 factory/editor tests (`npm test`), the original hosted permission suite, and 25 additional sharing/onboarding regression checks (`cd site && npm test`).
- `npm run check` typechecks, runs the builder's API, policy and execution tests on real data and denial paths, and builds the view and extension.
- The site tests run against the real API on a fresh in-memory database. They cover invites, kicking, revoking, removing companies, fund and company policy, receiving off, rejected hashes and file names, outsiders denied downloads, rebinding, and the demo seed.

The verifier lives outside generated code. Runtime code has a memory cap and an execution deadline. Local factory state is `.local/common-ground.sqlite`. Unfinished jobs show as failed instead of pretending to finish.

## Tools, libraries and licenses

Built during EVOLVE with AI coding tools (Claude Code; Eve agents), which the rules allow.

| What | Used for | License |
|---|---|---|
| Claude Code (headless, `claude -p`) | Live build agent in the local factory (`BUILD_PROVIDER=claude`) | Anthropic terms |
| Fastify, @fastify/static | Local builder server | MIT |
| QuickJS (quickjs-emscripten) | Sandbox that runs the seven checks | MIT |
| Eve (eve) | Build agent framework | Apache-2.0 |
| Vercel AI SDK (ai), @vercel/connect | Model calls through the Vercel AI Gateway | Apache-2.0 |
| HydraDB SDK (@hydradb/sdk) | Company context collections for fit evidence | See package |
| ElevenLabs Scribe (API) | Audio brief transcription | ElevenLabs terms |
| csv-parse, zod, dotenv | Parsing, validation, config | MIT, MIT, BSD-2-Clause |
| esbuild, tsx, TypeScript, Vite, @vscode/vsce | Build and packaging | MIT, MIT, Apache-2.0, MIT, MIT |
| Vercel (hosting, functions), Upstash Redis | The hosted site and API (`site/`) | Services |
| Google Identity (OAuth 2.0) | Sign-in | Service |
| Geist (Vercel) | Typeface | SIL Open Font License 1.1 |
| Lucide icons | Console and site icons | ISC (`site/dashboard/LUCIDE-LICENSE`) |
| Wikimedia Commons images | Site backgrounds: NASA ISS and Landsat 8, NPS Katmai, NASA Earth Observatory, NASA/ESA/CSA/STScI Webb (public domain); walnut leaf venation by Cristian V. (CC BY 4.0) | As listed |
| Company favicons | Portfolio company marks (illustrative) | Belong to their companies |
| NOAA PMEL Saildrone data, NREL PVDAQ data | The checks' sample datasets | CC0, CC BY 4.0 (`fixtures/DATA_LICENSES.md`) |

## Team notes

Latest implementation and deployment handoff: [NOTE_FOR_CONNOR_AGENT.md](NOTE_FOR_CONNOR_AGENT.md). Teammate setup and API variables: [docs/SETUP.md](docs/SETUP.md). Earlier editor task: [NEXT_FOR_CONNOR.md](NEXT_FOR_CONNOR.md).

## Current two-person demo

Use [the fictional portfolio scenario](docs/DEMO-SCENARIO.md) and [the five-minute runbook](docs/DEMO-VIDEO.md). Anushka creates Meridian Frontier Fund and Pelagic Robotics; Connor creates Helioforge Energy using the fund company invitation. Save workflow briefs only after those company records exist.

Prepared multi-project demo: [four working examples and rehearsal guide](docs/FOUR-PROJECT-DEMO.md). Extension 0.1.5 adds editable weather, revenue, battery and inference examples alongside the original live inspector factory.
