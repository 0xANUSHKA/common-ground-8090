# Connor / SocialAcolyte: next implementation task

**Assignment for your coding agent: finish the native editor recipient experience.**

The next milestone is one real, quiet handoff: Fabio approves a checked tool; Maya's already-open Start view receives one useful introduction; Maya adapts it, opens its actual files, and can return to those local files later. Permission changes must remove future access without breaking files she already downloaded. Keep everything inside the existing Start tab.

This document is an implementation assignment, not a description of features already finished. The starting baseline is commit `9a5d8c0`, plus this handoff commit. Pull current `main` before working.

## Start here

1. SocialAcolyte's write access to `0xANUSHKA/common-ground-8090` is confirmed. Authenticate your local Git client with your own account.
2. Read `AGENTS.md`, `README.md`, `docs/PRODUCT_BRIEF.md`, `docs/SETUP.md`, `docs/ARCHITECTURE.md`, and `docs/DEMO.md`. The product brief fixes the buyer (fund platform teams), delivery (one IDE extension) and accurate marine-to-solar story.
3. Run `npm ci`, `npm run check`, `npm run doctor`, and `npm start` with Node 26.x. Reference mode requires no keys and is sufficient for your entire assignment.
4. Package/install the extension with `npm run package:extension`; use **Common Ground: Open Start** in VS Code or Cursor.
5. Work directly on existing `main`. You are not alone in the repository: preserve others' changes, pull before starting, and inspect remote changes before pushing. No force pushes, branch/worktree creation, unrelated refactors or overwriting local work.

## Ownership

You own `web/main.ts`, `web/style.css`, `extension/src/**`, focused recipient/editor tests, and a new `docs/EDITOR-VERIFICATION.md`. Small extraction into adjacent helper modules is welcome. Edit build/test configuration only if needed for those tests.

Anushka's agent owns `agent/**`, provider credentials/setup, `server/factory.ts`, and sponsor integrations. Keep server policies, verification, source data, and API contracts intact. If you discover a backend blocker, describe the exact endpoint and expected behavior in your handoff before making a coordinated change. Never relax a permission check to make a demo pass.

## What exists already — preserve it

- Build → seven independent checks → immutable source hash → explicit named-recipient approval.
- Typed company/user/capability relationships and server-side permission filtering.
- Same-company and portfolio introduction rows, creator identity hover/focus, adaptation, real CSV checks, opt-out and revocation.
- `GET /api/state` returns only eligible offers for the current identity, capped and deduplicated on the server.
- `POST /api/artifacts/:id/adopt` creates a **server-side adaptation record**, not a downloaded local folder.
- `GET /api/artifacts/:id/package` rechecks access and returns an allowlisted source bundle.
- The extension already downloads into a fresh folder and invokes the editor's ordinary Open Folder command.

## Deliver in this order

### 1. Make receiving feel natural without a refresh ritual

Today the view refreshes on explicit actions; it does not receive an offer while sitting idle. Add refresh when the Start panel becomes visible/focused and a modest bounded poll while signed in, visible, idle, and on Start. A five-second interval is enough for the demo. Keep at most one refresh in flight. Clear timers/listeners on disposal. Back off on failures; do not keep making unauthorized requests after session expiry.

Use the existing `/state` endpoint and extension bridge. Do not add WebSockets, another service or a new feed. Render only if displayed state changed; preserve keyboard focus and scroll. Do not interrupt a brief, share selection, settings draft, adaptation or running build. A late response from an old identity/session must never overwrite the current identity's state. Never show a toast for every poll.

When receive preferences change in another window, fresh state must remove ineligible offers. A stale open detail that receives a 401/404 on the next action should explain that access is unavailable and return safely to Start; do not show a success state or retain an active download button for the denied action.

### 2. Tell the truth about adapted versus downloaded tools

There is a concrete v0 issue: `start()` currently labels every `state.adoptions` entry **Saved to your workspace**, even though adaptation only wrote to SQLite. It also opens those rows through the server artifact endpoint. That means a revoked artifact can leave a misleading row that no longer opens.

Separate three states without adding new pages:

- **Shared with you:** an eligible unopened recommendation.
- **Adapted · ready to open:** adaptation is verified, but no local folder has been saved.
- **Local workspace:** an actual folder successfully written by the extension, opened by its stored URI rather than a fresh artifact download.

On a completed save, store a minimal local receipt in extension state: artifact ID, core hash, binding hash, display name, local URI, and timestamp. Do not store credentials or source in global state. Deduplicate local rows by URI/version; prefer the real local row over a duplicate adaptation row. Preserve ordinary user workspaces. Handle existing `{name, uri}` recent entries without deleting them.

Cancel must create neither a receipt nor a success message. If the folder is missing later, show a clear local error without silently downloading a new version. After revocation or Receiving Off, real local folders must still open normally; server-only adaptation records must never be advertised as local files. Do not delete downloaded code to enforce revocation.

### 3. Complete the save path and keyboard interaction

Extract package validation/file saving from the extension message handler into testable helpers if useful. Validate the **entire** package before writing: source hash, required fields/files, allowed filenames, and string contents. Reject traversal paths, unexpected files, malformed bindings/provenance and oversized responses. A bad later entry must not leave earlier files presented as a successful project. On write failure, remove only the fresh directory this operation created, never user-selected parent contents. Do not run code, install dependencies or add editor tasks on download.

Continue using the loopback server and existing trust gate. Do not replace this with Git clones, GitHub tokens or session-history sharing. The server remains the access authority; local checks protect the file-writing boundary.

Keep creator information accessible by keyboard as well as hover. Same-company offers show the person; cross-company offers show the company mark and reveal the creator. Preserve the disclosed placeholder company marks. Check a narrow editor panel, long names, tab order, and disabled/loading states. Avoid nested focusable controls that make the identity tooltip or repo open action ambiguous.

### 4. Prove the native flow and leave evidence

Add focused tests for the behavior you introduce, not screenshots that only prove a page rendered. Extract small pure helpers and fake the editor boundary where appropriate; do not add a large test framework merely for this task.

Required automated cases:

- Identity switch during a delayed refresh cannot surface the previous user's offers; only one refresh is in flight.
- Adaptation alone never creates a local receipt; cancel/failure creates none; successful save creates one; repeated refresh does not duplicate it.
- Unexpected filenames or a hash mismatch fail before files are saved; partial writes are cleaned up only inside the newly created project folder.
- Opening a recorded local workspace does not call the artifact/package endpoint; untrusted workspace still blocks new download/run operations.

Then perform the actual native-editor rehearsal. Browser-only testing does not count as this deliverable:

1. Fabio builds the explicitly labeled reference tool and shares with Theo/Maya.
2. Maya's visible Start view receives exactly one offer on its next refresh without navigating away. You can use two demo sessions on the same machine; this is not a claim of remote company delivery. If VS Code SecretStorage makes simultaneous native identities impractical, use Fabio in the browser preview and Maya in the editor. Do not redesign authentication for the demo.
3. Maya previews, adapts and gets 1,440 solar observations with the same core hash. Fault challenge shows 1,438 rows, three missing timestamps and one duplicate.
4. Maya cancels the folder picker: no saved-project message or local row. Repeat and complete it: real allowlisted files appear in a fresh folder and open in the editor.
5. Fabio revokes access. Maya cannot fetch the package again, but her downloaded folder still opens. Repeat the boundary with Receiving Off.
6. Restart the backend: session expiry is understandable and reselecting an identity works. Keep existing local receipts.

Record commands/results, editor/version, screenshots of Start → offer → opened files → preference boundary, and any remaining limitations in `docs/EDITOR-VERIFICATION.md`. Never capture API keys, unrelated private workspaces or personal communications. Keep proof artifacts small and appropriate for a public repository.

## Done means

- All four stages above are implemented, with truthful state labels and no new product surface.
- `npm run check` and `npm run package:extension` pass; installed extension was actually exercised.
- `docs/EDITOR-VERIFICATION.md` distinguishes automated checks, manual native checks and anything unverified.
- Push a focused commit to `main`; ensure CI passes. Report commit SHA, changed behavior, test results and known gaps to Connor. Do not deploy, publish an extension, send Slack/Discord messages or activate paid services.

## API and scope boundaries

No API keys are required for this assignment. Anushka's local `.env` is intentionally absent from the public repository. As of this handoff, 8090 requirements creation and ElevenLabs transcription have succeeded live. A Vercel AI Gateway key is now installed locally, but its first inference request returned `403 customer_verification_required`: Vercel requires a valid payment method before serving requests. Live generation remains unverified; keep reference mode. HydraDB billing was declined and remains deferred.

Do not add a marketplace, Slack bot, MCP, agent-session merging, automatic updates, another database, or a new onboarding flow. Do not patch VS Code's private native Recent implementation. This is an extension-owned Start view. Do not present demo company identities as actual partnerships or the local backend as production cross-company infrastructure.

**Demo sentence to optimize for:** “I built this once. The right colleague received it inside their editor, it was checked against their data, and they opened the real tool—without rebuilding it.”
