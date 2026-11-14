# Common Ground: positioning and ship plan

Team decision, November 14, 2026. Read this with [Connor's implementation assignment](../NEXT_FOR_CONNOR.md), [API setup](SETUP.md), and [the five-minute demo](DEMO.md).

## What we are pitching

**Software reuse and distribution for investment portfolios, delivered inside the IDE.**

“Software factories build tools. Common Ground makes those tools useful across the portfolio.”

- **Buyer:** the fund's operating/platform team, establishing an approved network between participating portfolio companies.
- **Everyday user:** an engineer at a portfolio company, already working in VS Code or Cursor.
- **Problem:** useful bespoke tools stay with their creator while other teams rebuild equivalent functionality.
- **Outcome:** an approved, relevant tool appears in the recipient's editor; its reusable core is checked against the recipient's data before they adopt it.
- **Delivery:** one IDE extension with an extension-owned Start view and a small preferences view. The browser version is a development preview of the same UI, not a second product.

Call it an **IDE extension** when describing installation. Call it a **portfolio software reuse layer** when describing the business. “Plugin” is an informal synonym, not a separate deliverable. Do not present it as a standalone app marketplace or claim we have already built a general-purpose autonomous software factory.

Within-company reuse and cross-company reuse use the same mechanism with different permission boundaries. The fund is the first buyer we are targeting, not a superuser entitled to every company's code. Participating companies choose what can leave; the destination must opt in; only named eligible people can receive; personal preferences can narrow access further. Production export rights and independent company approvals remain to be implemented.

## The concrete demo

Fabio's marine telemetry completeness tool can also help Maya's solar-data workflow. Common Ground identifies the shared need, checks eligibility, introduces the tool in Maya's Start view, and verifies a different data binding while keeping the approved core unchanged.

The current demonstration is **marine → solar**, not a wind-farm → solar-farm integration. The marine fixture contains wind measurements, which is where the wind wording came from. Source data are public NOAA/Saildrone and NREL PVDAQ datasets. Demo company roles, needs, participation and grants are illustrative; public historical investment references are not proof of current holdings or partnerships. The solar CSV is not Palmetto customer data.

The visible moment is small: “Someone already built the useful part for you.” The technical evidence is concrete: source hash, independent checks, rejection of the wrong row-skipping assumption, and successful execution on the recipient's data. Do not lead with an ontology graph or a list of sponsors.

## What is actually in the repository

| Component | Implemented and checked | Current limit |
|---|---|---|
| IDE surface | Compiled Start view, identity-marked recommendations, preferences, VSIX packaging; installed in Cursor | Full native download rehearsal is still Connor's task; native VS Code Recent is not patched |
| Local backend | Loopback Fastify API and persistent SQLite state | Selectable demo identities, not SSO or remote company delivery |
| Ontology/matching | Typed companies, memberships, capabilities, network policy and grants; capability matching | Seeded relationships and deterministic tags; no automatic organizational knowledge extraction |
| Authorization | Named recipients, source/destination restrictions, version-bound review, expiry, opt-out, mute, revocation and no onward sharing | Demo policy configuration; no enterprise admin/identity integration |
| Tool execution | Bounded QuickJS executor; seven checks before artifact creation; hashes bind source, binding and check record | One pure-function contract, not arbitrary applications |
| Adaptation | Two known schemas; wrong solar row binding rejected; correct binding verified against real data | Schema-driven adaptation, not arbitrary adapter synthesis |
| Delivery | Policy-checked source bundle and extension download/open code | Local backend; receipt accuracy, refresh and save-boundary hardening are assigned to Connor |
| Generation | Eve worker and candidate submission/repair path implemented | No successful live generation yet; reference mode is explicitly hand-authored |
| Verification | Nine automated tests; typecheck/build/VSIX CI passing at the audited baseline | New editor behavior still needs tests and native evidence |

GitHub carries our application source. Produced tools travel as approved source bundles, not Git clones or shared agent sessions. We do not need to build another Git system for this demo.

## External API readiness

Status checked against local configuration and recorded live-call evidence on November 14, 2026. Keys are local secrets, not included in a clone. An env variable being present does not prove that a provider works.

| Service | Actual role now | Status | Required to finish this demo? |
|---|---|---|---|
| 8090 | Records requirements for a build brief and execution contract | Project key installed; authenticated health and document creation succeeded | Optional to the core distribution loop. It does not execute our builds. |
| ElevenLabs | Uploaded audio brief → editable Scribe transcript | Restricted key installed; real transcription succeeded | Optional input flourish. Typed input works. |
| Vercel AI Gateway + Eve | Generate a candidate and repair it using independent test feedback | Key installed with $1 non-refreshing budget; inference returned `403 customer_verification_required`. Account needs payment-method verification. Full worker loop unverified. | Required for an honest live-generation claim; not for the reference-tool reuse demo. |
| HydraDB | Company-scoped retrieval of supporting public evidence | Adapter/seed script ready; no key or live query. Subscription explicitly declined. | No. Local evidence and deterministic policy already work. |
| Composio | No role in the current implementation | Not configured | No. Do not add it for sponsor coverage alone. |
| GitHub | Collaboration and CI for Common Ground | Repo pushed; SocialAcolyte write access confirmed | Yes for team collaboration; no runtime GitHub token needed. |

We have **not** configured all providers as working live services. We also do not need all of them to demonstrate the product. No sponsor logos or narration should imply functionality beyond this table.

## Next: finish the functioning demo

1. **Connor's agent — native recipient experience.** Implement `NEXT_FOR_CONNOR.md`: bounded offer refresh, accurate adapted-versus-downloaded states, local receipts that still open after revocation, complete package validation, native editor evidence. Stay inside the existing UI and API contracts.
2. **Anushka + her agent — live builder.** Account owner completes Vercel payment-method verification if they choose to use its credits. Then run the actual Eve worker, build from a brief, submit source, exercise the independent checks, and inspect the resulting `eve-generated` artifact. Repair any worker integration failures; a successful one-word model response alone is not enough. Keep reference mode until that succeeds. Do not activate HydraDB or buy a subscription as an implicit dependency.
3. **Both — one full five-minute rehearsal on the presentation machine.** Real sender approval → recipient arrival → rejected incorrect binding → verified correct binding → fault challenge → actual folder open → permission opt-out. Confirm failures are understandable and no unrelated private files appear on screen. Keep an already verified artifact available; disclose a reference-tool fallback if generation is unavailable.

**Demo release gate:** the above sequence works in the installed extension, CI passes after integration, and `docs/EDITOR-VERIFICATION.md` records what was actually exercised. We can demonstrate distribution from a completed reference tool without claiming live generation. We cannot call the whole build-and-distribute path live until the Eve path has also succeeded.

## After the demo: a real multi-company product

These are separate milestones, not extra demo features:

1. Verified company identities/SSO, persistent sessions, independent company approval and administrative policy management. A fund relationship alone never authorizes sharing.
2. Hosted tenant-aware backend and artifact storage, signed manifests, operational audit records, quotas, and authorization before metadata or bytes leave their scope. Do not expose the current local identity-selector server publicly.
3. Consent-based ingestion of company capabilities and tool descriptions, with source evidence and ACL synchronization. Evaluate recipient relevance against a small real pilot; avoid spraying recommendations.
4. A supported tool packaging contract beyond this one function; version/update review, dependency handling, isolated execution and rollback. Preserve the “no silent execution” boundary.
5. An invited pilot with a fund platform team and two willing portfolio companies. Measure accepted recommendations, successful reuse, false positives and verified time saved; do not invent ROI from demo activity.

The central promise stays the same throughout: the right tested tool reaches the right permitted person, inside their existing workflow.
