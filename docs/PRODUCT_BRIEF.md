# Common Ground: positioning

Team decision, November 14, 2026. Read it alongside [the Devpost write-up](DEVPOST.md), [the demo plans](DEMO-VIDEO.md) and [architecture and limitations](ARCHITECTURE.md).

## What we are pitching

**An ontological software factory for venture portfolios.** Agents build tools against the fund's shared data standard rather than one company's columns, so any tool that passes the factory's checks can run at every company that has mapped its data.

Spoken: "One software factory for the whole portfolio."

- **Buyer:** a fund's platform/operating team. The fund sets the standard (the shared ontology) and the outer sharing rules.
- **Everyday user:** an engineer at a portfolio company, working in VS Code or Cursor.
- **Problem:** fast-moving companies produce bespoke tools constantly. Most stay with their creator, and other teams and companies rebuild them.
- **Outcome:** a tool built and checked at one company reaches named, permitted engineers at another, already bound to their data. The fund sees the reuse and an estimate of the hours saved.

## How to describe the factory honestly

Say **a factory for one contract type today** (sensor time-series completeness, `inspect(rows, binding)` against Sensor time-series v1), **built to add contracts.** Don't describe it as a general-purpose autonomous factory for arbitrary software.

The line:
1. A brief, typed or transcribed from a recording by ElevenLabs Scribe, is filed as a requirement in 8090's Software Factory.
2. A coding agent writes the function.
3. Seven independent checks run in a QuickJS sandbox on real NOAA and NREL data. Failures go back to the agent for repair, up to three attempts.
4. The passing version is sealed by its hash.
5. It is shared with named people.
6. It is rebound to each recipient's mapping and counted.

"Ontology" means one thing everywhere: the fund's shared data types (Sensor time-series v1: time, value, unit, time basis, cadence), each company's mapping to them, and the tool contracts that read only those types. Leading with it is right; it's the factory's context. Keep any graph of it consistent with that definition.

The fund is the first buyer, not a superuser. It can't download company code. Companies choose what leaves and what arrives, recipients are named people, and every read re-checks permission.

## What is real today

| Part | Status |
|---|---|
| Hosted site, Google sign-in, funds, companies, invites, roles, mappings, sharing policy, grants, revocation, package delivery with rebinding, reuse counts | Live on https://common-ground-theta.vercel.app; 46 hosted permission checks |
| Local factory: 8090 requirement, build, seven sandboxed checks, hashed artifacts | Working on Node 26; 9 builder tests |
| Live agent build | Claude Code (headless) passed 7 of 7 on the first attempt. Eve via Vercel AI Gateway is wired but was blocked by billing verification. |
| ElevenLabs Scribe audio brief | Live call verified; available in the Build view |
| HydraDB fit evidence | Adapter only, not connected |
| Demo fund | Sample data, with illustrative companies and people. Public datasets; the solar data is not Palmetto customer data. |
| Hours saved | An estimate: reuses times the author's build hours |

## Next

1. Store the 8090 requirement ID in each tool's provenance, for traceability across companies.
2. Re-run the checks on the server at publish time.
3. Add contracts and standards beyond sensor time-series.
4. Check the registry before building ("this already exists against the standard").
5. Versioned updates that re-check and re-offer.
6. Company SSO and independent export approval.
7. A pilot with one fund platform team and two of its companies, measuring accepted shares, real reuse, false positives and verified hours saved, never ROI invented from demo activity.
