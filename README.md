# Common Ground

**Your software factory finished a tool. Someone else in your portfolio needed it yesterday.**

Common Ground finds that second use, checks the permission boundary, binds the tool to the recipient's data, and quietly places an approved introduction in their editor. One surface: a VS Code Start tab. No marketplace, Slack spam, or automatic code execution.

Built for EVOLVE, November 13–14, 2026. MIT licensed. Public demo data; illustrative company roles and permissions.

## Run the v0

Requires Node **26.x** (uses built-in SQLite), npm, and optionally VS Code/Cursor.

**Joining the project?** Start with [teammate setup, all API variables, and verified integration status](docs/SETUP.md).

```sh
npm ci
cp .env.example .env
npm run check
npm run doctor
npm start
```

Open http://127.0.0.1:4317 for a development preview of the same Start view. The actual product surface is the extension:

```sh
npm run package:extension
code --install-extension common-ground-0.1.0.vsix
```

In VS Code, run **Common Ground: Open Start**. The backend must be running. Cursor also accepts the VSIX. The extension requires workspace trust before build, run, adaptation or download. It never installs dependencies or runs downloaded code automatically.

The native VS Code Welcome/Recent renderer has no supported public API for these custom rows. This is an **extension-owned Start view**, tracking workspaces opened while installed; it does not patch or pretend to mirror all native Recent history.

## The working loop

1. Enter as **Fabio / Saildrone**, then Build a tool. The default is an explicitly labeled, hand-authored offline reference template. Live Eve mode generates source from the brief.
2. The worker tests a portable `inspect(rows, binding)` function inside bounded QuickJS/WASM: no filesystem, environment, imports or network. A passing candidate becomes an immutable, hashed artifact.
3. Run the real NOAA dataset: **1,440 observations, 55 missing wind values**. Inspect the code and seven independent checks.
4. Approve the exact version for **Theo** (same company) and **Maya** (approved portfolio company). Names appear only after policy filtering and capability matching. Elli is not eligible; Leo's workflow does not match.
5. Switch to Maya. One small company-marked introduction appears in Recent. Hover or focus the identity to see Fabio.
6. Adapt for my workspace. Inheriting NOAA's units-row setting would retain **1,439** solar records. The binding check rejects it; the known PVDAQ schema retains **1,440**, with local time preserved. The core hash stays identical.
7. Run fault challenge. Three observations are removed and one duplicated **in memory**: **1,438 rows, 3 missing timestamps, 1 duplicate**. Original files remain unchanged.
8. Open project in editor to download actual source, binding, dataset and provenance into a fresh folder. Receiving Off hides unopened recommendations and blocks new fetches; already local files remain yours.

See [the five-minute demo](docs/DEMO.md), [architecture and limitations](docs/ARCHITECTURE.md), and [source licenses](fixtures/DATA_LICENSES.md).

## Integrations

| Service | Implemented role | Setup |
|---|---|---|
| 8090 Software Factory | Records a real requirements document for each build brief and execution contract | `SOFTWARE_FACTORY_API_KEY` |
| Eve + Vercel AI Gateway | Optional live agent generates source, calls `submit_candidate`, sees independent failures, repairs | `AI_GATEWAY_API_KEY`, `BUILD_PROVIDER=eve`; run `npm run agent:dev` in another terminal |
| HydraDB v2 | Indexes source-linked public company context in separate company collections; queries only policy-eligible collections for fit evidence | `HYDRADB_API_KEY`, then `npm run hydra:seed` |
| ElevenLabs Scribe | Audio brief → editable transcript → build specification; never grants sharing permission by voice | `ELEVENLABS_API_KEY`, then **Audio brief** in Build |

Keys are server-only in ignored `.env`. Never put them in the webview, source, screenshots, or Git. **The offline mode remains plainly labeled; configuring a key does not imply a successful live call.** 8090's external API does not execute automations: Common Ground's worker executes the implementation and tests. Composio and a hosted deployment are intentionally outside this v0's single-surface scope.

## Permission boundary

```text
fund participation + artifact class
  ∩ source-company publisher/export role
  ∩ reviewed immutable version + passing checks
  ∩ explicit grant: named users, scope, expiry, no resharing
  ∩ destination-company opt-in + eligible member list
  ∩ personal receive scope + publisher mute
  → capability match → at most two unopened offers
```

The policy engine runs **before metadata, counts, retrieval, preview, adaptation and download**. Each fetch checks again. An LLM cannot add a recipient, edit a grant, mark tests passed, or override opt-out. Revocation blocks future fetches; it cannot erase an ordinary repository already downloaded.

This is a **single-machine demo**, with a loopback-only server and selectable, illustrative identities. It is not enterprise authentication. Do not tunnel or deploy it publicly. Production needs company SSO, external identity verification, persistent multi-tenant storage, administrative policy management, audit retention, legal export rights and stronger operational controls. See the architecture document for the exact boundary.

## Checks

`npm run check` typechecks, runs API/policy/execution tests and builds the view/extension. `npm run agent:build` separately compiles the Eve worker. Tests exercise real data and denial paths, not animated success states. Runtime code has a memory cap and execution deadline. The independent verifier lives outside generated artifacts.

Local state is `.local/common-ground.sqlite`; it persists grants, artifacts, adoption and preferences across server restarts. Restarting the server invalidates in-memory login tokens, so select your demo identity again. Unfinished jobs become visibly failed instead of silently pretending to finish.
