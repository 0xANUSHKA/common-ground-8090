# Starting a fresh two-person rehearsal

For the current purge and deployment commands, use [RESET-AND-DEPLOY.md](RESET-AND-DEPLOY.md).

Both editors must use `https://common-ground-theta.vercel.app` as their Common Ground server. The live service already uses shared Upstash Redis for accounts, companies, mappings, briefs, published packages, grants and reuse. Running the website locally uses an in-memory development database and will not synchronize with production.

Each computer has separate editor history and downloaded projects. The local factory also stores its own build records in `.local/common-ground.sqlite`. Git synchronizes application code, not these runtime databases.

## Reset status, 14 November

Anushka requested clearing demo activity **and** onboarding, including the old Demo Fund and its demo companies. Her local builder database was cleared while the builder was stopped, then the builder was restarted. API keys were preserved. This does not remove the separate verification artifacts, downloaded folders, or provider-side 8090 requirements.

The hosted reset is **not complete**. Vercel denied this connection access to Connor's team. Do not claim that deleting the fund alone resets the demo: the current API detaches its companies, and deleting organizations does not cascade through every tool/package/reuse record.

The scoped hosted cleanup must cover Demo Fund (`2qnkjgc7g6`) and its five confirmed demo companies: Ocean Guys, Solar Solutions, Solar Demo, Solar Fund and SocialAcolyte. Before mutation, recheck membership and activity. Delete their published packages, tools, grants, invitations, organization records, membership references, audit and reuse records; preserve Google user identities, credentials and unrelated workspaces. Verify both users have no remaining memberships or shares from that demo. Do not flush the database.

## Each laptop

1. Close old downloaded demo-project windows.
2. Install Common Ground extension **0.1.3**. In the Command Palette run **Common Ground: Clear Local History**. It clears Common Ground's recent entries and receipts and signs out; it does not erase downloaded files or hosted data.
3. Delete only the old generated demo folders you no longer want, using Finder. Check for edits first. Connor must do this on his laptop; remote revocation cannot erase downloaded code.
4. Reopen Common Ground and sign in after the hosted reset is verified. Reload old dashboard tabs so they fetch current data.

## Rehearse after the reset

1. Anushka creates a new fund on `/join/?kind=fund` and uses **Set up my own company** to create the ocean company.
2. Send the **new** fund company invitation to Connor. He creates the solar company. Old invite links should no longer work.
3. Each company saves its own sample mapping and workflow brief. Confirm both are in the new fund.
4. Both editors sign in to the live service. Connor should see no shared tools. Anushka starts a new build, waits for checks and runs it on the ocean sample.
5. Anushka reviews the recipient suggestion and shares the checked version with Connor.
6. Connor opens the new offer, saves to a fresh folder, and runs the downloaded inspector on the solar sample. Show the same source hash and the different data binding.
7. The new fund dashboard should show only this rehearsal's tool and reuse.

No additional database is required. Keep build execution local for this demo; both editors discover and download approved shares from the same hosted database.
