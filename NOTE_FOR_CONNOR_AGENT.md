# Return handoff: onboarding, recommendations and editor delivery

November 14, 2026. This builds on your `dbf2150` handoff on `main` and preserves the software-factory direction.

## Latest: recipient execution in extension 0.1.1

The two-person handoff succeeded. The recipient payoff is now implemented: **Opened from Common Ground → Run on solar sample**. It executes the saved `inspector.js` with the recipient's solar mapping, locally in bounded QuickJS in a worker. No model/API key/builder needed. It verifies the downloaded source hash before execution, runs original and deliberately faulted copies, and displays measured results + identical source hash. Generated source `3ffbf0b…` from Anushka's actual build passed this replay locally. This is a supported solar-fixture demo, not arbitrary CSV execution.

**Update Connor's VS Code now:**

```sh
git pull --ff-only origin main
npm ci
npm run package:site
code --install-extension common-ground-0.1.1.vsix --force
```

Reload VS Code when prompted. Open Common Ground Start. The existing downloaded receipt should remain; no rebuild or reshare is needed. Click **Run on solar sample** underneath the saved tool in **Opened from Common Ground**. Expect original: 1,440 rows / 0 missing / 0 duplicates; altered: 1,438 / 3 / 1. The UI explicitly labels injected faults and shows the source hash. If the receipt isn't listed, reopen/download the same already-shared version.

To update the public VSIX download, deploy `site/` after `npm run package:site`; there is no hosted API change in this increment. The new extension is 0.1.1 so clients can distinguish it from 0.1.0. Root tests now total 16. The local UI harness uses a test receipt and real generated source; Connor's new native execution remains to rehearse after installation.

## What changed

- Fund setup is now a three-step flow: identity → explicit company-only/cross-company choice → company invitation.
  Company join lands on a role-aware **Get started** checklist: map data, describe the team's needs, invite engineers,
  set Publisher/Exporter rights, install/sign into the editor. Fund managers get a separate readiness checklist.
- Recommendations use company-admin-authored shared workflow briefs and user-ID-linked reuse records. They filter
  policy before returning people, cite the reason, recommend named people, omit existing recipients, and abstain when
  evidence is missing. A compatible schema alone no longer gets everyone recommended. Demo seeds have illustrative
  briefs; real companies must supply their own. No recommendation is preselected for automatic sharing.
- One policy predicate now guards suggestions, inbox and package delivery. Fixed personal opt-out/company-only/mute
  bypasses on downloads, same-company receiver bypass, stale author Publisher/Exporter permissions, and wrong binding
  selection for recipients who belong to multiple companies. Fund admins still cannot fetch code by virtue of their role.
- The extension polls every 15 seconds and notifies about newly shared tool/hash pairs when Start is hidden. First login
  stays quiet. `commonGround.notifications` disables the toast; receiving preferences still govern access. No auto-run.
- Extension tokens are pinned to the signed-in server. A different server requires signing in again; URL config is
  machine-scoped. Existing installations need to sign in once after this update. View refreshes reject stale responses.
- Company-name explanation and seeded-history labels now distinguish public illustrative references from actual users.
  Estimated hours are author estimates, not measured savings. Demo packages are labeled reference-template.
- Claude CLI JSON errors now expose actionable OAuth/limit failures instead of an empty subprocess error. Doctor accepts
  the Claude provider and the editor displays its configured builder. `npm run package:site` packages/copies the VSIX.

## Verified

- `npm run check`: typecheck, 13 factory/editor tests, production extension/webview build.
- `npm --prefix site test`: original hosted permission suite plus 25 added setup/sharing regression assertions.
- `npm run package:extension`: VSIX built. Installed into Anushka's Cursor; copied to `site/download/common-ground.vsix`.
- Browser QA on the actual local service: create a fund with company-only policy, get invite, join a company, save a
  workflow brief, reload and confirm persisted values/checklists. Generated local QA data stays in the dev server's RAM.
- **Live Claude run on Anushka's machine now succeeds after she refreshed OAuth.** Generated blueprint and source,
  repair attempt, all seven checks, then recipient solar fault challenge: 1,438 rows, three missing timestamps, one
  duplicate. Generated source differs from reference. 8090 requirement creation succeeded. Observed run: 92 seconds.
  Local `.env` is now `BUILD_PROVIDER=claude`, and the restarted builder listens on 4317. Proof lives in ignored
  `.local/live-build-verification.json`; it contains no credentials. An offline template was not substituted.

## Your next action: deploy this exact checkout

Your existing Vercel project owns Google OAuth and Redis. This checkout cannot access that deployment, and Git push
alone does not deploy. Preserve the existing domain/callback. From the repository root:

```sh
git pull --ff-only origin main
npm ci
npm run check
npm --prefix site test
npm run package:site
cd site
vercel deploy --prod --yes
```

Use your existing linked `common-ground` Vercel project/account as described in `site/README.md`; do not create a new
project accidentally. The VSIX is intentionally ignored by Git, so packaging before deployment is required. Confirm
https://common-ground-theta.vercel.app/download/common-ground.vsix serves the regenerated extension.

## Final rehearsal before recording

1. Use two real Google accounts in two consenting companies, not only the seeded admin demo. Map both samples and set
   related shared workflow briefs. Enable portfolio sharing and give the source engineer Publisher + Exporter.
2. Install the updated VSIX in both editors; sign in again. For the recipient, open Start once and then switch to code
   so the first polling baseline is established before the share.
3. Build with Claude through the local factory. Show the blueprint, a passing artifact and its source/check lineage.
   Review the evidence for one named recipient and explicitly share.
4. Recipient receives a native notification within roughly 15 seconds, opens Start, saves the bundle, and checks that
   the core source is identical while `binding.json` names the destination mapping. Run the supported inspector on the
   recipient fixture; do not claim arbitrary repository adaptation.
5. Turn receiving off/revoke the grant and show that a new fetch fails. An already downloaded file remains local.
6. Show recorded reuse in the console. State that demo history is illustrative and estimated time is not measured ROI.

**Still unverified end to end:** this new extension's two-account production OAuth → notification → download flow;
production deployment of these changes; the final screen recording. Local API regression tests do not replace it.

## Product boundaries worth defending clearly

The hook is a factory that produces portable checked components, then introduces them to eligible engineers with
specific evidence. Portcos demonstrate the organizational boundary; the same pattern applies between divisions.
The supported output is currently a telemetry-completeness function, not arbitrary code sharing/adaptation.

Before production, the hosted endpoint must independently rerun tests or require a signed trusted-verifier attestation.
Currently it verifies source hashes but trusts uploaded passing check records. Company identity/SSO, export approval,
metadata isolation, transactional operations, rate limits and full-package signatures also need work. See
`docs/ARCHITECTURE.md`. These are explicit remaining work, not features to claim in the pitch.

8090 requirements and ElevenLabs transcription have real verified calls. Claude now works without adding a Vercel
payment method. AI Gateway remains billing-blocked; HydraDB was explicitly deferred (no subscription authorized).

## Invitation login follow-up

Found and fixed a separate navigation bug: the public header's Sign in link on `/join/?invite=...`
dropped the invitation and returned to the user's existing dashboard. Header sign-in now preserves
the invitation through the sign-in page and signed OAuth state. The main Continue with Google button
already preserved it. Two regression tests cover the actual header renderer and OAuth state round-trip.

This is a possible explanation for Connor landing in his existing SocialAcolyte workspace; the exact
link/navigation path still needs confirming. Login alone does not create a company or assign an admin role.
Deploy the updated `site/nav.js`; no extension rebuild is needed for this follow-up. Immediate workaround:
while already signed in, reopen the original fund company invitation and use its main form.


## Website onboarding refresh (14 Nov, after recipient execution)

Deploy the current `main` from `site/` as usual. No new keys, database migrations, or extension update are required for this website change. Keep the packaged 0.1.1 VSIX available at `site/download/common-ground.vsix` when deploying.

- `/join/` now starts with workspace choice, existing memberships, and invitation entry. It no longer assumes every new user is creating a fund.
- After creating a fund, **Set up my own company** continues into that fund's company invitation with the same account. Fund Overview/Get started has the same action. Existing fund admins can use it immediately.
- Company invitations require an explicit existing/new company choice. Companies already joined are shown as resume links. Repeated same-owner/same-name joins return the existing company; selecting an already-linked company does not recount the join. This guards normal retries, not concurrent transactions (that production hardening remains deferred).
- An account can retain separate fund and company memberships. Fund access never becomes company code access. Dashboard remembers the last directly joined workspace per account/browser.
- Company setup has one next-step banner: mapping → workflow brief → editor, with fund sharing pauses visible. The obsolete overview checklist that inferred extension installation from tool count is removed.
- Cosmetic changes: clearer role labels, workspace cards, compact permission summary, responsive layout, and explicit completion/continuation states.

Validated with the local real API + local Google stand-in: create fund, create own company, save ocean mapping, save brief, switch fund/company, reopen invitation, and generic dashboard returning to the last company. Checked the invitation at 390px. Hosted tests include five new membership/retry regressions; prior sharing and OAuth-navigation checks pass. This is UI/flow hardening, not a claim that all production security gaps above are solved.

## Visual redesign: field atlas

The public site, sign-in/onboarding and dashboard now use a coherent paper/ink/vermilion identity. The landing page has original generated atlas artwork, a custom vector mark and colophon, an editorial layout, the existing working film, and the permission demonstration. The film now has pause/play controls. New assets and the exact generation prompt are in `site/art/`; the raster is a ~480 KB WebP. `atlas.css` styles public pages; `dashboard/atlas-console.css` keeps the working UI restrained.

This does not change account roles, API permissions, data, extension behavior or deployment requirements. The onboarding changes from the previous commit remain intact. Deploy `site/` including `art/` and both new CSS files. The walkthrough and company examples remain explicitly illustrative.
# Fresh rehearsal reset (14 November)

Anushka wants to clear old demo activity **and redo onboarding**. See `docs/FRESH-REHEARSAL.md` for exact scope and current blockers. Hosted Upstash is already shared; do not provision a second DB. Hosted cleanup is still pending team access. Extension 0.1.2 adds **Common Ground: Clear Local History**, which signs out and clears receipts/recents only; it deliberately does not delete downloaded folders or claim to reset server data. Rebuild with `npm run package:site` before your next deployment so the download includes 0.1.2.
