# Teammate setup

## First run: no API keys required

SocialAcolyte has been invited with GitHub **write** permission. Accept the repository invitation in GitHub before pushing. Work on the existing `main` branch.

```sh
git clone https://github.com/0xANUSHKA/common-ground-8090.git
cd common-ground-8090
# Use Node 26.x.
npm ci
cp .env.example .env
npm run check
npm run doctor
npm start
```

Visit http://127.0.0.1:4317. Follow [the five-minute demo](DEMO.md). This mode exercises real verification, permissions, adaptation and downloads using a clearly labeled hand-authored tool. It does not generate source with a model.

For the editor surface, in another terminal:

```sh
npm run package:extension
code --install-extension common-ground-0.1.0.vsix
# Or: cursor --install-extension common-ground-0.1.0.vsix
```

Open the command palette and select **Common Ground: Open Start**. Keep the backend running. After restarting it, select your demo identity again. Run `npm run doctor -- --server` to check configuration and backend reachability without exposing secrets or calling paid providers.

## API configuration

All keys go in your local ignored `.env`, never GitHub, browser code, screenshots or chat. A clone does **not** contain Anushka's credentials. Use a separately scoped key or an approved private secret-sharing channel. Restart both backend and worker after changes.

| Feature | Environment | Setup and activation | If absent |
|---|---|---|---|
| 8090 requirements | `SOFTWARE_FACTORY_API_KEY` | In Software Factory, create/select a private project and create its project-scoped external API key. Each requested build writes a FEATURE requirements document through `https://api.factory.8090.dev/v2/external-api`. | Build works without requirements recording. |
| Live generation | `AI_GATEWAY_API_KEY`, `BUILD_PROVIDER=eve`, `EVE_URL=http://127.0.0.1:8000` | Create a Vercel AI Gateway key with a spending limit and access to the model selected in `agent/agent.ts`. Start `npm run agent:dev` in a second terminal, then restart the backend. | Keep `BUILD_PROVIDER=reference`. |
| Audio brief | `ELEVENLABS_API_KEY` | Create a restricted ElevenLabs key with Speech to Text permission. In Build, select **Audio brief**, upload audio, review the transcript, then build. Uses Scribe v2. | Type the brief. |
| Retrieval evidence | `HYDRADB_API_KEY`, `HYDRADB_DATABASE=common_ground_demo` | When separately authorized and provisioned, add a HydraDB key and run `npm run hydra:seed`. Collections are company-scoped and selected by server policy. | Local public evidence; permission checks still work. |

HydraDB's recurring subscription was explicitly declined. Do not activate billing as part of setup. Composio, a GitHub runtime token, and a Vercel deployment are not required. 8090 is requirements storage in this version, not the build executor.

## Verified integration status on the development machine

As of November 14, 2026:

- 8090: project-scoped key installed locally; authenticated health and requirements creation succeeded.
- ElevenLabs: restricted key installed locally; a real Scribe transcription of a synthetic spoken brief succeeded.
- AI Gateway: key creation awaiting account-owner email verification. Live model generation is **not yet verified**. Keep reference mode until an actual generated candidate passes the checks.
- HydraDB: adapter and seed script implemented; no key, subscription or live query. Connection deliberately deferred.
- Editor: VSIX packaged and installed in Cursor. Browser preview and API flow verified; a complete native-editor download rehearsal remains to be performed.

Configuration presence is not a successful integration check. `doctor` makes this distinction and never submits provider requests. For a live rehearsal, create a build and inspect its events: an 8090 requirement ID confirms that write; `eve-generated` provenance plus passing checks confirms generation. Provider failures surface as failures, never as fallback success.

## How sharing actually works

The GitHub repository distributes **Common Ground itself**. Tools produced within the application travel over its authenticated API as a source bundle: `inspector.js`, the recipient's `binding.json`, `provenance.json` with source/check hashes, a public demo CSV, README and data licenses. The editor verifies the core source hash, permits only known filenames and saves into a new folder. It does not clone Git history, transfer agent sessions, install dependencies or auto-run code.

In this v0, sender and recipient are selectable identities on one loopback backend. This demonstrates policy and recipient experience; it is not yet a deployed cross-company delivery service. Already downloaded source cannot be recalled. Future fetches are blocked by opt-out or grant revocation.

Keep this transport for the demo. Git can later provide source history behind immutable artifact versions without changing the UI. Remote production delivery needs authenticated company identities, hosted artifact storage and policy enforcement before any recommendation metadata or bytes are released. Agent-session merging is a different product and outside this build.
