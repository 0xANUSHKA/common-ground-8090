# Four prepared projects for the portfolio demonstration

These are functioning, prepared reference projects with synthetic inputs. They are not live-generated builds, real portfolio-company code, customer deployments, production benchmarks, or measured time savings. The original Claude-generated ocean-to-solar inspector remains the live factory example. The four projects show the broader distribution and execution surface. No new accounts or companies are created by the seed action.

## The four projects

| Project | What the audience sees | Sharing example | Change during the demo |
| --- | --- | --- | --- |
| Weather window planner | Two candidate work windows, five usable hours, and reasons to exclude other hours | Survey engineer → own field team; survey company → solar maintenance engineer | Set maximum wind from 8 to 4 m/s; no two-hour window remains |
| Revenue reconciler | $450 outstanding, one duplicate ignored, $7 unmatched | SaaS engineer → finance teammate; reusable at another portfolio company | Set the second invoice payment from $50 to $200; outstanding becomes $300 |
| Battery test reviewer | Two of three packs need engineering review, with temperature, cell balance and capacity reasons | Battery test engineer → manufacturing teammate; robotics → storage company | Set minimum capacity from 48 to 51 Ah; all three require review |
| Inference capacity planner | Cheapest qualifying configuration after evaluating throughput, latency and budget | Infrastructure engineer → AI product engineer; compute tooling reused across companies | Lower daily demand from 10 million to 1 million tokens; selected cost changes from $96 to $60/day and the selected configuration changes |

All thresholds, costs and benchmark measurements are illustrative. Battery results are not safety certification; weather windows are not launch clearance. Revenue does not move money. Capacity planning assumes linear scaling and does not establish real latency under load.

## Rehearsal

1. Both editors need extension **0.1.5**. `npm run package:site` builds the VSIX and updates the site download. Install `common-ground-0.1.5.vsix`, then reload the editor.
2. In Common Ground Start, confirm your working company. **Project examples** contains all four previews. Pick one, click **Run project**, change its named assumption, then run again. Every displayed result is executed code, not a saved answer.
3. On the source laptop click **Add four examples to my company…**. Select your own team and the named portfolio recipients you want. Publishing first executes each project's seven acceptance cases in a sandbox. Existing identical copies and active grants are reused on subsequent seeds.
4. On Connor's laptop, refresh Common Ground Start. Shared examples appear in the normal inbox with their actual author and source company. Open a shared item, save to a new folder, then find it under **Opened from Common Ground → Open project → Run project**.
5. A preview under Project examples executes the bundled prepared code. A project under Opened from Common Ground executes the actual downloaded code, verified against its saved hash. Use the downloaded route to demonstrate cross-company reuse.
6. The team grant covers eligible members of the source company. It does not create fake coworkers or grant new membership. Showing an actual teammate receiving requires another authorized account in that company; Connor should remain in his own company for the portfolio demonstration.

## Five-minute selection

Keep the original brief → 8090 requirement → Claude build → independent checks as the proof that there is a factory. Show the four-project list for ten seconds. Spend the remaining time on one downloaded project: weather is easiest to explain, revenue has the clearest commercial result, and battery is the strongest hardware example. Do not attempt four separate walkthroughs.

Opening message: “Every engineer can now create useful software. The factory's output becomes more valuable when another team can use it with their own inputs and permissions.”

Close: change one assumption on Connor's downloaded copy, run it, and show that its source hash remains unchanged. Explain that input portability is explicit: these examples use a JSON decision-report contract, while the original inspector uses mapped sensor columns. We do not yet have arbitrary application generation, deployment, dependency resolution or automatic schema adaptation for every tool category.

## Implementation and checks

- `examples/`: four independent JavaScript programs, a catalog, two scenarios each, and seven acceptance cases per program.
- `extension/src/project-runtime.ts`: executes source inside QuickJS without host APIs, with memory/runtime bounds and report-schema validation.
- `extension/src/project-worker.ts`: isolates execution from the editor host with an outer timeout.
- Packages include source (the existing `inspector.js` transport filename), `common-ground.json`, `checks.json`, and README. The generic runner uses `run(input)`; the solar runner still uses `inspect(rows,binding)`.
- Download receipts verify the source hash. Inputs remain editable and are not signed. Changed code is refused. The hosted service validates the hash and stores the local check attestation; it does not independently rerun the tests in production.
- The seed creates genuine team and named-recipient grants under existing permission rules. These are intentionally curated demo shares, not fabricated recommendation matches.
- No keys, live payment records, private benchmarks or raw company data are included.
- The updated hosted service stores project-specific check labels, zero unmeasured build hours, and skips the time-series rebind for decision projects. Deploy `site/` before showcasing the hosted dashboard.

## Why these sectors fit the audience

Social Capital's published investment history includes enterprise software and frontier hardware. Its 2020 annual letter discusses Groq's machine-learning chip work. Palmetto announced a Social Capital-led solar funding round in 2022. These historical references motivate the examples; they do not establish current holdings, endorsements, or real workflows at those companies.

- https://assets.website-files.com/62798fa6e691d928dfa83737/62d9dbe2d8575f1e389abea2_2020%20Social%20Capital%20Annual%20Letter.pdf
- https://palmetto.com/about/media-center/press-release/palmetto-raises-375-million-to-accelerate-residential-clean-energy-independence

## Limits still in the v0

The live generation pipeline remains specialized to the time-series inspector. These four additional tools are prepared examples with their own checks, not new live generation templates. Hosted permission categories and onboarding still come from the original portfolio model; this update adds no external system privileges. The application continues to use the existing shared database and company identities.
