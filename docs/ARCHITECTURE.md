# What is engineered, what remains

## Runtime
The VS Code webview communicates only with a small extension-host message bridge. The host holds the local session token in VS Code SecretStorage and calls a loopback Fastify server. The same compiled view has a browser development preview. SQLite stores typed company/user/capability records, immutable artifacts, explicit grants, preferences, adoption and audit events.

The v0 ontology is a typed relationship model: company belongs to the demo network; publisher belongs to company; tool provides capabilities; person needs capabilities; source company permits a peer; grant names exact recipients and artifact hash. This is not just RAG. Deterministic set intersection handles authorization and initial matching. HydraDB adds source evidence from separately scoped public collections; it is not the access-control authority. It does not yet learn a company ontology from Slack or internal codebases.

The live Eve worker has optional built-in tools disabled and one authored submission tool. It produces a bounded pure function. An independent verifier executes code through QuickJS/WASM with a 32 MB memory cap and 800 ms per-evaluation deadline, without host APIs or imports. This is a constrained JavaScript capability, not a general-purpose container or a claim of formally verified sandbox security. Code must pass seven checks on real and synthetic observations before artifact creation. Human review is still required for distribution.

8090 persists requested requirements. HydraDB retrieval is performed only after artifact access checks, with server-chosen company collections. ElevenLabs transcribes a user-selected audio file; the user reviews the resulting brief before building. Neither model nor voice output can grant permissions.

## Invariants
- An artifact's source, source binding and check record are hash-bound. Only the server creates passing records.
- A grant is creator-issued and restricted by network, source company, destination company, named recipient and personal preference.
- Recipient code downloads cannot contain arbitrary paths, install scripts or editor tasks: the extension accepts a fixed file list into a fresh folder and verifies the source hash.
- Every preview/fetch/adaptation rechecks policy. Off means no new sharing access. Adopted files remain local.
- A capability-bearing build submission can create an unreviewed candidate only. It cannot publish.
- Recipient bindings retain local time conventions and do not inherit domain-specific physical thresholds.
- Failed and interrupted builds remain visible. Provider errors are not replaced by fake success.

## Intentionally narrow
- Local demo identities are selectable, not authenticated company memberships. Loopback binding, Host/Origin checks and request markers prevent ordinary cross-origin browser access; any local OS user remains within the demo trust boundary. Never tunnel this server or run it on a shared host.
- No enterprise SSO, tenancy administration UI, Slack ingestion, legal IP-export approval, automatic install, or background execution.
- Two known dataset schemas, one supported tool contract, capability-tag matching. Arbitrary-codebase analysis and general software adaptation are future work.
- A two-offer display cap and hash deduplication are implemented. Daily delivery budgets and novelty learning are future work.
- Source versions are immutable through the API. New builds need new review. No update propagation workflow yet.
- SQLite is local persistent storage, not a multi-instance cloud database. Eve's local runtime is separately started. A remote deployment needs real auth and persistent hosted storage before exposure.
- Company marks are deliberate demo placeholders; production must use verified organization identity assets.
- Recent contains extension-tracked workspaces and approved offers; it does not overwrite VS Code's internal history.

## Production order
1. OIDC/SSO identities and signed organization membership, then policy administration with independent source/destination approval.
2. Postgres/object storage, transactionally signed artifact manifests, deterministic job idempotency, session expiry and audit retention.
3. Tenant-filtered HydraDB ingestion with ACL synchronization, deleting revoked derived metadata and validating extracted ontological edges.
4. Independent adapter synthesis/evaluation on consented recipient schemas; sandbox on separate hosts; rigorous generated-code red teaming.
5. Operational rollout: rate limits, budgets, observability, rollback, package supply-chain attestation and adoption feedback.
