# Architecture and boundaries

## Two runtimes, one engineer surface

Engineers use the VS Code/Cursor extension. Fund and company admins configure the network in the hosted console.

| Component | Responsibility | Storage / identity |
|---|---|---|
| Hosted API (`site/api/index.js`) | Google sign-in, fund/company membership, invitations, mappings, shared workflow briefs, policies, grants, packages and recorded reuse | Upstash Redis; signed sessions and extension bearer tokens |
| Local factory (`server/`) | Brief → optional 8090 requirement → blueprint → generation/repair → independent checks → artifact and lineage | SQLite; loopback-only local demo sessions |
| Extension (`extension/`, `web/`) | Build, review suggestions, explicitly share, receive and save projects, track local source drift | SecretStorage for tokens; local receipts and tracked workspaces |

The hosted service is deployed separately from the builder. Receiving needs only the extension and hosted sign-in.
Building currently requires Node 26, the local factory and a provider configured on the engineer's machine.
The browser at port 4317 is not the engineer product. Local site development at port 3000 uses fake Google identities
and an ephemeral in-memory Redis implementation; never expose that development server publicly.

## Ontology and relevance

The current ontology is an explicit model: a fund contains companies, companies have members/roles, companies map
columns to a common telemetry contract, tools have authors and versions, and grants connect approved recipients to
versions. Company admins write a short shared workflow brief. Recorded reuse belongs to a user ID, not a display name.

Suggestions first apply the same eligibility predicate as package access. The matcher then compares meaningful words
in a tool's name/brief with the destination company's shared brief and the person's prior reuse. Returned evidence
includes its source and matched words. It can return no candidates. A matching schema alone does not demonstrate need.
This is deterministic evidence matching, not a learned enterprise ontology, employee surveillance or general RAG.
HydraDB's optional scoped evidence adapter belongs to the local factory; it is not connected to hosted recommendations.

## Build and verification

Claude Code headless or the optional Eve worker generates a bounded `inspect(rows,binding)` JavaScript function.
The independent local verifier executes it in QuickJS/WASM with a 32 MB memory cap and 800 ms per-evaluation deadline,
without host filesystem/network APIs or imports. Seven checks use real public NOAA/NREL data plus synthetic edge cases.
The agent receives failures and can repair up to three attempts. The reference provider is a hand-authored template,
explicitly labeled; provider failures are not converted to template successes.

8090 records the requirement; Common Ground executes the build. ElevenLabs transcribes a selected audio recording into
a brief the user reviews. Neither integration can authorize sharing. Local lineage links the requirement, blueprint,
source, binding and check hashes. These local records are not yet portable signed attestations.

**Hosted verification is weaker:** the publish endpoint verifies the source hash and requires seven uploaded passing
check records. It does not independently execute those checks or authenticate the uploader's verifier. An authorized
publisher could forge that record. This must be fixed before treating hosted packages as independently verified code.
The seeded demo fund contains illustrative history and reference-template tools, not evidence of real customer usage.

## Permission and delivery behavior

- Authors need current membership and Publisher permission; portfolio export additionally needs Exporter permission.
- A portfolio grant requires an enabled shared fund, mapped source/destination companies, company participation,
  compatible receive/class/peer rules and a recipient who remains an enabled receiver.
- Personal off, company-only and muted-sender settings apply to suggestions, inbox listing and package downloads.
- Grant revocation and removal of publisher/exporter rights block future fetches. A fund admin can inspect network
  metadata but cannot download company code solely because they administer the fund.
- Downloads use the destination company from the authorizing grant, including when a person belongs to several companies.
- The extension binds credentials to the signed-in server. Changing that server requires a new sign-in.
- The extension polls every 15 seconds. First login stays quiet; new tool/hash pairs may generate one native notification.
  Notifications can be disabled. No automatic dependency install or code execution, Slack or email delivery occurs.
- The extension verifies the source hash, restricts filenames, and writes into a fresh folder after the user chooses
  its parent. `binding.json` uses the destination's mapping. Recents is extension-managed, not VS Code's native history.
- Revocation cannot erase an already saved copy. Drift checking currently compares `inspector.js`, not every package file.

## Remaining production work

1. Independently re-run checks at publish or require trusted, signed verifier attestations; sign the full package manifest
   including recipient binding. Reject partial writes and clean up failed package downloads.
2. Verified company identity / SSO, bounded invitations, independent export approvals, and stricter metadata visibility.
   Fund metadata access is intentionally broad in this prototype; it is not enterprise field-level authorization.
3. Transactional grant/publish operations, idempotency, audit retention, rate limits, session revocation, operational
   monitoring and durable artifact storage. Redis state updates are not a full concurrent production transaction model.
4. A real two-account hosted/editor rehearsal, a new-share notification check, and packaged download validation after
   deploying. Local automated tests do not prove external OAuth callbacks or production configuration.
5. General tool contracts and adapters beyond telemetry completeness. No arbitrary repository analysis, cross-company
   automatic code adaptation, Slack ingestion or automatic update propagation is implemented.
6. Recommendation evaluation against realistic needs, negative examples and delivery budgets. Suggestions are capped;
   the inbox does not yet enforce a daily delivery budget. Author time estimates are not measured business impact.

## Recipient execution (0.1.1)

An explicit Run on solar sample action reads an existing download receipt's source and binding. The source hash must
match the receipt. A bundled worker runs QuickJS with a 32 MB sandbox cap and 800 ms evaluation deadlines; the host
terminates the worker after eight seconds. The generated source receives no host filesystem or network callbacks.
The bundled fixture is hash-checked. The supported solar mapping is validated, then original and deliberately altered
rows are executed and actual reports displayed. No model, local builder or hosted API request is involved. Saved files
are untouched. The source receipt is not a signed full-package attestation; binding edits are validated for this fixture
but not authenticated as an original company-authorized mapping.
