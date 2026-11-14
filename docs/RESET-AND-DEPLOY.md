# Fix and reset handoff for Connor

The user authorized **blank workspace histories for both Anushka and Connor**, including their old and newly created companies and funds. Keep Google identities and credentials. Connor will execute the hosted purge from his authorized environment. It has NOT been executed from Anushka's machine.

Use [DEMO-SCENARIO.md](DEMO-SCENARIO.md) for the new fictional portfolio and exact company briefs. If the purge has already completed, continue with company creation; do not repeat it after new onboarding.

## Deploy the fix

1. Pull `main` and run `npm ci`, `npm run check`, `npm --prefix site test`.
2. Run `npm run package:site`. This makes **0.1.3**, including the ignored `site/download/common-ground.vsix`. Deploy `site/` using your existing Vercel access. Git push alone does not deploy.
3. Install the new VSIX on **both** laptops and run **Developer: Reload Window**. Having a VSIX file in the Explorer does not mean that version is installed. Verify the version in Extensions.

This update adds explicit **Working company** selection, remembered per server/account. Multiple memberships no longer silently select the first Redis result. The inbox, recipient mapping, reuse attribution, notifications and newly saved receipts follow the selected company. The editor refuses scoped downloads against an old server rather than silently using its old mapping logic. Old files on disk are not deleted by filtering.

Fund invitations say **Create your company in [fund]** and open the new-company form for a fresh account. Engineer invitations name the target company, state they do not create a company, and require an unchecked confirmation before joining. Copy buttons distinguish company invitations from engineer invitations. A member's accidental company is no longer presented as a company they administer.

## Purge the shared records once

Use the **existing production Upstash** URL/token in your local environment. Do not create another database or commit credentials. The script accepts `KV_REST_API_URL` / `KV_REST_API_TOKEN` or the Upstash-named equivalents. Node's `--env-file` can load an ignored file.

```sh
node --env-file=.env.maintenance.local scripts/purge-demo.mjs --list-users
```

Find Anushka (`jogalekar.anushka@gmail.com`) and Connor by their actual user IDs and verified email/name. Do not guess IDs. Then:

```sh
node --env-file=.env.maintenance.local scripts/purge-demo.mjs --users ANUSHKA_ID,CONNOR_ID
```

This is **preview only**. Review the company/fund names and counts. Stop both people's demo activity, then repeat with the exact printed confirmation:

```sh
node --env-file=.env.maintenance.local scripts/purge-demo.mjs --users ANUSHKA_ID,CONNOR_ID --apply CONFIRMATION
```

The script removes organizations they own, their memberships, tools/packages, invitations and grants, and related reuse references. Other people's companies attached to a deleted fund are detached, not deleted. Other users' identities, unrelated data and Google sign-in bindings remain. Company-local audit logs are deleted with their companies; unrelated organizations retain their audit logs. No `FLUSHDB` or `FLUSHALL` is used. Read-time snapshots are checked again inside an atomic Redis script before mutation; keep the application idle during maintenance.

If a selected company has a HydraDB revision, the script requires Hydra credentials and deletes only its `cg_brief_<companyId>` source within `cg_company_<companyId>` before Redis cleanup. It never deletes the shared Hydra database. A Hydra failure stops the Redis purge so the operation can be retried. Public demonstration context is separate and remains.

Verify in both accounts after reload: `/api/me` has no org memberships, `/api/shared` has no prior shares, and the old invitations fail. Do not claim success solely because the CLI exited; inspect both accounts.

## Each laptop

1. Run **Common Ground: Clear Local History**. This clears editor receipts, recent entries and working-company choices, and signs out.
2. Stop the local builder with Ctrl+C. Preview local reset with `npm run purge:local`; apply with `npm run purge:local -- --apply CONFIRMATION` using the printed value. Restart with `npm start`.
3. Close old project windows. Delete any unwanted downloaded demo folders deliberately in Finder after checking for edits. These are real files; a server purge cannot remove them from someone else's laptop.
4. Sign back in and reload dashboard pages. Start onboarding fresh: Anushka creates fund, creates her company using **Set up my own company**, and sends the **fund company invitation** to Connor. Connor creates his separate company. Map samples and save briefs, then sign into the editors. Choose the correct working company if more than one membership exists.

## HydraDB

Anushka created an approved key and stored it only in her ignored local `.env` (mode 600). Her free workspace has **`default-tenant`**; the plan allows one database. Do not provision another or subscribe. Live public-source indexing/query and a temporary company-brief upload/query/delete were verified. The temporary test source was deleted.

For hosted recommendations, configure `HYDRADB_API_KEY` and `HYDRADB_DATABASE=default-tenant` in the existing Vercel project's production environment, then deploy. Transfer the key through an approved secret channel; never Git, logs, or chat. Saving a company's shared workflow brief indexes only that brief; code, CSV samples and email addresses are not uploaded. Recommendations query only companies with eligible recipients, using a collection, source ID and current revision filter. Retrieval is a suggestion signal (threshold 0.65), not authorization or proof of usefulness. Existing keyword/reuse evidence remains the fallback when indexing is unavailable. Re-save existing briefs after configuring Hydra, or use the newly created companies after purge.

Tests: root check (17 tests), hosted permissions + 43 setup/sharing regressions, invitation confirmation, Hydra isolation/current revision, packaged VSIX solar replay, and `npm run test:purge` against disposable local Redis. The purge test requires `redis-server` and `redis-cli` installed; it does not use production credentials.
