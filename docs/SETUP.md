# Teammate setup

Work on `main`. SocialAcolyte has GitHub write access. No credentials are included in a clone.

## Engineer: receive tools

1. Join your company using its invitation and Google sign-in.
2. Install the VSIX from https://common-ground-theta.vercel.app/download/common-ground.vsix.
3. Run **Common Ground: Open Start** in VS Code/Cursor, then sign in with the same account.
4. An approved share appears in Start. Choose where to save it; the extension verifies the source hash and opens a fresh
   project folder. Nothing runs automatically. Receiving needs no local factory or model API key.

New approved versions are polled every 15 seconds. Initial login is quiet; later shares notify while Start is hidden.
Use `commonGround.notifications` to disable notifications. Personal receiving preferences and company policy remain
separate from notification preferences. Existing installations must sign in once again after the credential-origin fix.

## Admin: configure the network

A fund admin uses `/join/` to name the network, choose company-only or cross-company sharing, and obtain a company link.
Company admins join, map a sample, save a **shared workflow brief**, and invite engineers. The Get started checklist in
the console explains each step. Give Publisher/Exporter rights only to authorized curators. Matching uses the shared
brief and actual reuse records; mapping a schema alone will not produce a recommendation.

## Engineer: build tools

```sh
git clone https://github.com/0xANUSHKA/common-ground-8090.git
cd common-ground-8090
# Node 26.x required
npm ci
cp .env.example .env
npm run check
npm run doctor
npm run builder:start
```

Keep the factory at http://127.0.0.1:4317 running, then use Build inside the extension. Port 4317's browser page only
points you to the editor. The local factory uses selectable demo source identities; they are separate from hosted
Google identities. The extension publishes the resulting package under the signed-in hosted author's company.

| Provider | Setup | Result |
|---|---|---|
| `BUILD_PROVIDER=reference` | No model key | Hand-authored template; real checks, visibly labeled |
| `BUILD_PROVIDER=claude` | Install Claude Code, run `claude auth login`; optional `CLAUDE_BIN` override | Live blueprint, generation and repair |
| `BUILD_PROVIDER=eve` | `AI_GATEWAY_API_KEY`, `EVE_URL=http://127.0.0.1:8000`, then `npm run agent:dev` | Alternative live agent worker |

Restart the factory after changing `.env`. `claude auth status` alone does not prove inference works; an actual build
must pass. OAuth failures now explicitly request `claude auth login` instead of showing an empty subprocess error.

## Develop and package

```sh
npm --prefix site run dev   # localhost:3000, disposable in-memory data, fake Google login
npm --prefix site test     # original hosted permission suite + 25 regression checks
npm run check              # typecheck, 16 factory/editor tests, build
npm run package:site       # VSIX and site/download/common-ground.vsix
code --install-extension common-ground-0.1.1.vsix --force
# or cursor --install-extension common-ground-0.1.1.vsix --force
```

For local hosted API testing set the extension's machine-scoped `commonGround.server` to `http://127.0.0.1:3000` and
sign in anew. Restore the hosted URL and sign in again before a live rehearsal. The dev database resets on restart.

The site is deployed on Connor's Vercel account. Git push does not deploy. The generated VSIX is ignored by Git and
must be rebuilt before deployment. Preserve the existing project/domain because Google OAuth's configured callback is
`https://common-ground-theta.vercel.app/api/auth/callback`. See [site/README.md](../site/README.md) and the latest
[return handoff](../NOTE_FOR_CONNOR_AGENT.md).

## Live build verified on this machine

On November 14, after refreshing Claude's OAuth login, an actual Claude build generated a blueprint and source,
repaired a failed candidate, passed all seven independent checks, and detected three missing timestamps plus one
duplicate in the recipient solar challenge (1,438 rows). The source differed from the hand-authored reference.
8090 created the requirement successfully. The run took 92 seconds; this is one observed run, not a latency promise.
Local `.env` now selects `BUILD_PROVIDER=claude`. Proof is saved locally in `.local/live-build-verification.json`.

## Optional integrations

All secrets stay in local ignored `.env` or Vercel's server environment; never put them in client code or Git.

| Integration | Variables / purpose | Verified status before this handoff |
|---|---|---|
| 8090 | `SOFTWARE_FACTORY_API_KEY`; FEATURE requirement through external API | Live requirements write verified |
| ElevenLabs | `ELEVENLABS_API_KEY`; Scribe recording → editable brief | Real transcription verified |
| Vercel AI Gateway | `AI_GATEWAY_API_KEY`; alternative Eve inference | Key exists locally; first inference blocked by billing verification |
| HydraDB | `HYDRADB_API_KEY`, `HYDRADB_DATABASE=default-tenant`; public evidence and company-scoped workflow retrieval | Free workspace connected and live-tested locally; set production environment variables before deploying hosted retrieval |
| Hosted service | `SESSION_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Connor's deployment; local tests do not prove production configuration |

8090 stores requirements, not execution. HydraDB is not the hosted database (Upstash is). Composio has no runtime role.
There is no need to activate a paid subscription to test reference mode or receive an approved package.

## Sharing transport

Git distributes Common Ground itself. Generated tools travel over the authenticated hosted API as source bundles,
not Git clones or agent sessions. The core source stays byte-identical while the recipient's binding changes. Grant
revocation blocks future access but cannot recall local files. See [architecture](ARCHITECTURE.md) for the important
hosted-verifier and production limitations.
