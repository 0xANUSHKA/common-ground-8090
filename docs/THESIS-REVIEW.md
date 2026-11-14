# Thesis review: does Common Ground read as an ontological software factory?

A skeptical judge's read of every public surface, written Saturday 2026-11-14 at about 6:30 AM PT. Devpost closes at 3:15 PM PT. Judging is a 5-minute live demo plus 2 minutes of questions. This is review only: no project files were changed.

**Verdict:** today the material pitches *distribution*: "your portfolio builds the same tool twice, we pass it around". The factory has been reduced to one sentence in one section, and "ontology" means two different things on two surfaces. For an event whose brief is "build your own Software Factory", with off-theme entries disqualified, that is the biggest risk we carry. The parts we need already exist in the code (`server/factory.ts`, `server/runner.ts`, the standard, the 8090 requirement call). The problem is the story, plus three places where the live product contradicts the claims.

---

## 0. Theme-fit risk (read this first)

**The brief, paraphrased from the event Discord:** AI agents that take software from idea to implementation, using the full context of an organisation (tickets, codebases, past coding sessions, emails, chats, meeting transcripts). The starter ideas include "a context layer that gives agents shared memory". Off-theme projects are disqualified.

**How Common Ground reads now:** a judge who reads the hero ("Your portfolio is building the same tools twice."), watches the captionless film and skims the Devpost tagline ("A shared data standard ... plus an IDE extension that hands a checked tool ...") will file it as *internal tool discovery* or a *portfolio package registry*. Neither is a software factory. Our material never says "factory" above the fold. The word appears only in README line 3 and in an error string in `extension/src/extension.ts:21`.

**Our product described in their terms. Use this mapping out loud:**

| Their language | Our implementation | Where it lives |
|---|---|---|
| Idea / intent / ticket | The engineer's brief in the Start view's Build screen (typed, or an uploaded audio recording such as a meeting) | `web/main.ts` buildView; `/api/audio-brief` in `server/app.ts` |
| Requirement recorded in the factory | Each brief plus its execution contract is written as a FEATURE requirement through 8090's Software Factory external API | `server/software-factory.ts`, called from `startBuild` |
| Agent implements | The Eve worker writes `inspect(rows, binding)` against a fixed contract and repairs it up to 3 times on failed checks | `server/factory.ts` `contract`, `startBuild`, `acceptCandidate` |
| Independent validation | Seven checks the agent cannot edit, run in QuickJS/WASM (32 MB, 800 ms, no host APIs) on real NOAA and NREL data | `server/runner.ts` `verifySource` |
| Traceable output | Source, binding and check record are each SHA-256 hashed; only `qualified()` artifacts can be shared | `server/policy.ts` |
| Organisational context / shared memory | **The ontology.** The fund's standard (Sensor time-series v1) plus every company's mapping to it, plus the registry of checked tools built against it. An agent at company B starts from company A's checked tool instead of from nothing. | `site/api/index.js` `STANDARD`, `org.mapping`; the hosted tools registry |
| Past coding sessions | A finished agent session's output becomes a shared, checked asset instead of dying on one laptop | Film chapter 01 |

**The sentence to say in the first 15 seconds of the live demo:** "This is a software factory that runs across a whole venture portfolio. The fund's shared data standard is the factory's context layer: agents build against it, the factory checks and seals each tool, and anything that passes can run at any company that has mapped its data."

**The honest weak point a judge will find:** live agent generation has never succeeded. AI Gateway returned `403 customer_verification_required` (`docs/SETUP.md`, `docs/PRODUCT_BRIEF.md`), so every build runs in labelled "reference template" mode. On a theme about agents implementing software, "the agent is a hand-written template" is the question that loses the round. Fix 6 below covers this.

---

## 1. The thesis in one sentence

Three candidates:

1. **"Common Ground is an ontological software factory for venture portfolios: agents build tools against the fund's shared data standard, not one company's columns, so any tool that passes the factory's checks can run at every company that has mapped its data."**
2. "A software factory whose blueprint is the fund's ontology: build at one portfolio company, check it once, run it at the next."
3. "The factory checks and seals what your agents build; the ontology makes it portable; the fund gets one factory instead of forty."

**Pick: 1.** It is the only one that says *why* the tool runs elsewhere (it was written against the standard, not against Saildrone's columns). That causal link is the actual idea, and it is true in the code: `contract` in `server/factory.ts` only ever sees `{time, value}` rows plus a binding. Candidate 2 is catchier but asks the judge to know what a blueprint means here. Candidate 3 is a slogan, not a claim.

Short form for the spoken pitch: **"One software factory for the whole portfolio. Agents build against the fund's shared ontology, so a tool checked at one company runs at the next."**

---

## 2. Gap analysis by surface

### Overview hero (`site/index.html` lines 7, 27–28)
- `<h1>Your portfolio is building the same tools twice.</h1>` states a problem. There is no factory, no ontology and no mechanism. A judge's 30-second takeaway is "deduplication", which is off-theme.
- The lede "Common Ground offers each one to the people ... who would otherwise rebuild it" describes a recommender. The agents are background noise ("Agents at your companies finish new internal tools").
- `<meta name="description">` (line 7) repeats the same framing. It is what link previews and Devpost unfurls show.
- The end section `<h2>Your portfolio already built it.</h2>` (line 338) closes on the same note.

### Film (`site/index.html` `<section class="film">`, `site/film/script.js`, `site/film/fund.js`)
- **The chapter titles never appear.** `data-captions="off"` on the film section (line 36) suppresses them (`tour/tour.js:143`). The only words that mention factory-adjacent ideas ("the agent finishes", "Shared ontologies across the portfolio") are invisible on the live site. `docs/DEMO-VIDEO.md` refers to the chapters as if viewers can read them.
- **Chapter 01 shows the agent's own tests, not the factory.** The tool list ends `npm test · 7 passed` (line 152) and the agent says "All 7 checks pass" (script.js line 31). The viewer learns that the agent graded itself, which is the opposite of the factory's point: checks the agent cannot touch (`runner.ts` lives outside generated code). There is no hash, no "sealed version", no binding and no 8090 requirement on screen.
- The film's tool is a multi-file TypeScript repo (`grid.ts`, `parse.ts`, tests). The factory's real contract is a single pure `inspect(rows, binding)` function in `inspector.js`. A judge who downloads the package will notice the difference.
- Chapter 01 shares within the team ("Theo and Ines", line 169). The cross-company reuse that *is* the thesis only happens as an abstract packet in chapter 03.
- **Chapter 03 defines "ontology" differently from the rest of the site.** `film/fund.js` draws a concept graph ("model inference", "access policies", "customer messages", "completeness checks"), essentially a capability map. Everywhere else, the ontology is a data schema (Sensor time-series v1). A judge asks "which one is it?", and no surface answers.
- `fd-legend` "builds / needs / shared concept" uses coloured dots: a status-dot pattern the house rules ban.

### Sections below the hero
- `#reuse` "Built once at Saildrone. Running at Palmetto." This is the closest thing to the thesis, but the factory is one clause: "passes all seven checks on real NOAA ocean and NREL solar data" (line 254). The `tr-big` "16 hours" block (line 263) is a stat tile in all but name.
- Line 259, "Her inverter data already maps to the fund's standard, so only the binding changes", **is not true on the hosted path** (see section 5). It is true only in the local loopback v0 (`adapt()` in `server/factory.ts`).
- `#standard` "The fund holds the standard." This is good and concrete, and it is the best ontology explanation we have. But it never says that *tools are written against the standard*. It says companies map to it, which leaves the judge to infer why that makes tools portable. Add one sentence (section 4).
- `#spread` "One link from the fund reaches every engineer." This is distribution mechanics. It is fine, but it is the third section in a row about distribution.
- `#security` "Who gets it?" is a nice interactive. It belongs after the factory, because it is the factory's shipping rule.
- **There is no section that shows the factory line.** Brief → agent → seven checks → hash → binding → share → rebind elsewhere is spread across four sections and the README.

### Console (`site/dashboard/console.js`)
- The ontology is well represented: the fund Overview lede (line 90), the Standard page (lines 146–148) and the company Data page.
- **The factory gate is fake on one path.** The company **Tools → Add a tool** dialog (lines 341–342) posts to `POST /api/tools` without files. The server then stores `hash: randomBytes(8)` and `checks: 7` (`site/api/index.js:290`). The tool page shows "7 of 7 passed" and "Version xxxxxxx is the exact code that passed" (line 229) for a tool that was never checked. The fund Tools lede says "Each passed all seven checks before it could be shared" (line 130). A judge clicking around the demo fund can produce a counterexample to our central claim in under a minute.
- The demo fund seeds `glider-dashboard` ("Live map of every vehicle") and `inverter-alarm-digest` (`site/api/index.js:419–423`) as tools that passed the same seven checks. Those checks only make sense for the time-series completeness contract, and both packages actually contain the `INSPECTOR` code. This muddles what the checks and the contract are, and therefore what the ontology buys you.
- The demo seed maps every company, Palmetto included, as `time` / `value` / `utc` (`map()` at `site/api/index.js:402`). The overview's standard table says Palmetto is `measured_on` / `ac_power__423` / local time. A judge who opens Palmetto in the demo console sees a different mapping from the one on the homepage.

### Extension Start view (`web/main.ts`, `extension/package.json`)
- The signed-out lede (line 41) is "Tools other engineers ... have built, checked and shared with you". That is the receiving side only.
- The Build screen (line 72), "Describe it. An agent builds it, then seven checks run against real ocean and solar data.", is the one place the factory is described plainly, and it is two screens deep.
- The Build screen never mentions the standard. The engineer doesn't see "this tool is being built against Sensor time-series v1", which is the moment the ontology and the factory meet.
- The built screen says "Built from the offline reference template." That is honest and correct, and it is what judges will see unless fix 6 lands.
- The **Audio brief was removed** in the rewrite: `server/app.ts:83` still has `/api/audio-brief`, but `web/main.ts` has no button. README line 58 still tells people to use "Audio brief in Build".
- Every local build silently runs as Fabio (`local('/demo-session', ..., {userId:'fabio'})`, line 134).
- The Marketplace description is "A quiet, permission-aware Start view for useful software shared across your organization." It has no factory and no ontology.

### Devpost draft (`docs/DEVPOST.md`)
- The tagline is a two-part product description, "A shared data standard ... plus an IDE extension ...". It has no factory, and it reads like two products stapled together.
- Inspiration is good writing, and the "communication and distribution" framing is honest. But it builds to "Common Ground is both of those things" (the standard and the IDE feature), not to "a factory".
- "What it does" opens with fund signup and the console policy list. The seven checks appear in paragraph four, under "For an engineer". That order is backwards for this event.
- The 8090 Software Factory API appears once, as the last clause of a "How we built it" bullet. For 8090 judges this is the most on-brand fact we have, and it is buried.
- "The whole loop works on a public URL" (Accomplishments) is softer in reality: building and checking need the local builder, and the hosted service does not re-run the checks (the draft admits this in Challenges). The two sections contradict each other.

### Video plan (`docs/DEMO-VIDEO.md`)
- Shot 1 opens on the agent finishing. That is a good image, but the voiceover is about laptops and rebuilding, not the factory.
- Shot 2 quotes a hero headline, "Shared ontologies for your portfolio companies.", **that no longer exists on the site.**
- The factory gets 20 seconds at 1:05 (shot 6), after 65 seconds of signup, joining, mapping and permission switches. A judge who skims the first 30 seconds of a tie-break video never sees it.
- Shot 10's close, "A shared standard ... A feature in the editor ... Common Ground is both.", has no factory in it.

### README (`README.md`)
- Line 3, "Your software factory finished a tool. Someone else in your portfolio needed it yesterday.", is actually the most on-theme line we have. It is in the file judges are least likely to read first.
- The rest describes the *old* single-machine v0 and contradicts the live product: "One surface: a VS Code Start tab" (line 5), selectable identities "Enter as Fabio / Saildrone" (line 40), "Do not tunnel or deploy it publicly" (line 76), "Composio and a hosted deployment are intentionally outside this v0's single-surface scope" (line 60). Meanwhile we ship a hosted Vercel site with Google sign-in and a fund console.
- Line 17 links an internal assignment ("Connor / SocialAcolyte's next assignment") at the top of a public submission.
- There is no list of the AI tools and libraries used to build the project, with their licenses, which the event rules require (section 5).

### `docs/PRODUCT_BRIEF.md` (public, and judges may open it)
- It says, "Do not lead with an ontology graph" and "Do not ... claim we have already built a general-purpose autonomous software factory." The first now contradicts the film and the thesis. The second is good advice, but it needs to be read as "say *a factory for one contract type*", not "don't say factory". Update it or judges will quote it back.
- "Nine automated tests" disagrees with the Devpost's "41 automated permission tests". Both are true (9 in `tests/`, about 41 assertions in `site/dev/test.mjs`), but no surface says so.

### What a skeptical 8090 judge asks, and whether we answer it today

| Question | Answered now? | Where the answer should be |
|---|---|---|
| "Where is the factory?" | **No.** One clause on the overview, two screens deep in the extension, paragraph four of the Devpost. | The hero, a new factory section, Devpost paragraph 1, video 0:00–0:20 |
| "Isn't this a package registry or internal GitHub?" | Partly. "No marketplace" is said, but not *why* we differ. | Answer: a registry stores whatever you push. The factory only accepts tools that were built against the shared ontology and passed checks the author can't edit, and it re-binds them to the recipient's data. A registry can't tell you that a Saildrone tool runs on Palmetto's data. We can, because both mapped to the same types. |
| "What does 'ontology' actually mean here?" | **Two answers:** a concept graph (film) and a data schema (site). | One answer: the fund's shared data types (Sensor time-series v1: time, value, unit, time basis, cadence), each company's mapping to them, and the tool contracts that read only those types. Retitle the film's concept map as "what each company has mapped" or drop it. |
| "Is the agent real?" | **No.** Reference template only. Honestly labelled. | Fix 6, or say plainly: "the factory line is live; the generation step today uses a reference build because our model provider blocked billing at 2 AM". |
| "Is anything real or is it all demo data?" | Yes, in the Devpost ("What's real and what's sample"). The site doesn't say it. | A one-line footer or `#security` note. Kill the fake-check path first (fix 2), or the honest list is wrong. |
| "Why does a fund pay for this?" | Partly: "Reuse you can measure", estimated hours saved. | Sharpen it: a fund already pays for a platform team. This makes every portfolio engineer's agent output a fund-level asset, with a reuse ledger the fund can show LPs. Say it once and stop. |
| "What happens when the tool needs to change?" | No (README "No update propagation workflow"). | One line: new version, new hash, checks run again, recipients re-offered. Matches 8090's "drift" idea. |
| "Does the server trust the client's checks?" | Admitted in Devpost Challenges. | Keep that admission. It is the right kind of honesty. |

---

## 3. How 8090 frames "software factory", and how to align without copying

**Their framing** (from 8090's own material):
- In ["What Is a Software Factory?"](https://www.8090.ai/blog/what-is-a-software-factory-) a factory is "a production system that guarantees output", as opposed to a tool that makes one person faster. Paraphrasing the rest of that essay: it starts from business intent, keeps intent, spec, code, tests and production behaviour in sync, works no matter who is at the keyboard, makes every output traceable like a lot number, and names someone who answers for the result.
- [The product docs](https://docs.8090.ai/general/introduction) describe Requirements → Blueprints → Work Orders → Feedback, joined by a Knowledge Graph so linked artifacts change together, with a drift detector flagging when code no longer matches intent.
- ["Seven Properties of an Aligned System"](https://www.8090.ai/blog/part-3-seven-properties-of-an-aligned-system) leans on two-way traceability (every artifact links up to a need and down to code), self-detected drift, and structure over culture.

**Our framing today:** distribution, discovery, permissions. Theirs is about guaranteed output, traceability and a shared context graph. We actually *have* those properties and describe them as plumbing.

**Where we line up, in our own words (don't borrow Refinery, Foundry or Blueprint):**

| Their idea | Our honest equivalent | Say it as |
|---|---|---|
| Guaranteed output | A tool can't be shared until the seven checks pass; `qualified()` is enforced on every share | "Nothing leaves the factory until it passes on real data." |
| Lot number / traceability | SHA-256 of source, binding and check record | "Every tool carries the hash of the exact code that passed." |
| Starts from intent | The brief is recorded as a requirement in 8090's Software Factory | "Each brief is filed as a requirement in 8090's Software Factory before the agent starts." |
| Knowledge graph / shared context | The fund's standard plus company mappings plus the checked-tool registry | "The ontology is the factory's shared context across companies." |
| Works regardless of who is involved | The same core runs at another company with a different binding | "Built by one engineer, run by another company." |
| Someone answers for it | `maintainer` on the artifact; named author in the console | "Every tool has a named author who answers for it." |
| Drift | Not built: a version change needs new checks, with no propagation yet | Say it as "next", not as done. |

**Where we extend their idea, and this is our creativity score:** 8090's factory lives inside one organisation. Ours spans organisations that share an owner. A fund is the one party that can set a standard across companies that otherwise never agree on a schema. That claim is worth making plainly: *a factory per company rebuilds the same tool forty times; a factory per portfolio builds it once.*

**One cheap traceability fix that 8090 judges will notice:** the 8090 requirement ID is written only to the build's event log (`server/factory.ts:30`). It is not stored on the artifact or in `provenance.json` (`server/app.ts:80`). Store `requirementId` on the artifact and include it in `provenance.json`. Then a downloaded tool at Palmetto links back to the requirement in 8090: two-way traceability across companies, about 20 minutes of work.

---

## 4. Fixes ranked by impact per minute (about 8 hours left)

Times are estimates for one person with an agent. Do 1–5 before anything else.

### 1. Hero, meta description and closing line (10 min) — `site/index.html`
- **Headline:** `One software factory for the whole portfolio.`
- **Subline:** `Agents at your companies build tools against the fund's shared data standard. A tool that passes the checks at one company can run at any other that has mapped its data.`
- **Meta description:** `Common Ground is a software factory for venture portfolios. Agents build tools against the fund's shared data standard, and a tool checked at one company runs at the next.`
- **Closing h2** (line 338): `Built once. Checked once. Running everywhere it fits.` If that reads as a triplet to you, use `Build it at one company. Run it at the next.`
- Keep the CTAs as they are.

### 2. Remove the fake "7 of 7 passed" path (20 min) — `site/api/index.js`, `site/dashboard/console.js`
- In `POST tools`, when there are no `files`: set `checks: 0` and `hash: null`, and add `handAdded: true`. On the tool page, replace the Checks card with "Registered by hand. Not checked, so it can't be shared across the portfolio." Better still, refuse portfolio grants for `checks < 7`.
- Change the fund Tools lede (line 130) to count only checked tools.
- Demo seed: rename or redescribe `glider-dashboard` and `inverter-alarm-digest` so every seeded tool is a time-series tool that plausibly fits `inspect(rows, binding)`, for example `glider-gap-report` and `inverter-dropout-finder`. Alternatively mark them hand-added with 0 checks, which also shows the gate working.
- Seed Palmetto's mapping as `measured_on` / `ac_power__423` / `local-unspecified`, so it matches the homepage table.

### 3. Add a section that shows the factory line (45–60 min) — `site/index.html`, `site/site.css`
Put it directly after the hero, before `#reuse`. Title: **"The factory line."** Sub: `Every tool goes through the same seven stations before anyone else can open it.`

Layout: one thin horizontal line with seven stops, labels above and real artifact text below. Stack it vertically on phones. No cards, tiles or dots, one typeface (render hashes and column names in Geist, not Geist Mono). Each stop is a short label and one plain sentence:

1. **Brief.** "Find missing timestamps and duplicates in a sensor CSV. Never guess a timezone." The brief is filed as a requirement in 8090's Software Factory.
2. **Built against the standard.** The agent writes one function that only sees `time` and `value` from Sensor time-series v1, never Saildrone's column names.
3. **Seven checks.** These run in a sandbox the agent can't touch, on real NOAA ocean data and NREL solar data. Show one failing first: "Wrong units-row assumption: 1,439 rows, expected 1,440." Then show it passing.
4. **Sealed.** The exact code that passed gets a SHA-256 fingerprint: `3f9c…` (use the real reference-build hash).
5. **Shared by name.** Fabio shares this version with Maya at Palmetto. No one else can open it.
6. **Rebound.** Palmetto's mapping swaps in: `measured_on` for `time`, `ac_power__423` for `value`, local time kept local. The core hash is unchanged.
7. **Counted.** The fund sees one reuse, about 16 hours not spent rebuilding.

Then move the "16 hours" out of the `tr-big` stat block into station 7's sentence, and cut `#reuse` down to the two-company trace. Add one sentence to `#standard`'s sub: `Tools are written against these fields, not against any one company's columns. That is what makes them portable.`

### 4. Devpost tagline and first paragraph (20 min) — `docs/DEVPOST.md`
- **Tagline:** `An ontological software factory for venture portfolios: agents build tools against the fund's shared data standard, so a tool checked at one company runs at the next.`
- **First paragraph** (put it at the top of "What it does", and move the console and policy lists below the engineer section):

  > Common Ground is a software factory that spans a venture portfolio. An engineer describes a tool in VS Code or Cursor. The brief is filed as a requirement in 8090's Software Factory, and an agent builds it against a fixed contract. Seven checks the agent can't edit then run it in a sandbox on real NOAA ocean and NREL solar data, and the version that passes is sealed with a SHA-256 hash. The ontology is what makes it portable. The fund holds one data standard (Sensor time-series v1: time, value, unit, time basis, cadence). Each company maps its own columns to it once, and tools are written against the standard rather than any one company's schema. So a tool built at Saildrone can be shared with a named engineer at Palmetto and run on solar data with only the mapping swapped.

- Bracket the agent sentence until fix 6 lands: "[an agent builds it / a reference build stands in for the agent today]".
- In Accomplishments, replace "The whole loop works on a public URL" with what's true: "Accounts, sharing, revocation and reuse counting work on a public URL; building and the seven checks run in the local builder."

### 5. Make "only the binding changes" true on the hosted path, or stop saying it (45 min, or 5 min to cut)
- Today, when Maya downloads a hosted tool she gets Fabio's marine `binding.json` and the Saildrone CSV, because the package is published from the owner's local artifact (`server/app.ts:77`). Her company's mapping (`org.mapping.binding`, stored by `PATCH orgs/:id`) is never applied. The ontology currently works as a *gate* (a company must be `joined` before it can trade) but not as the *adapter*.
- **The cheap real version:** in `GET tools/:id/package` (`site/api/index.js`), if the requester's company has a verified mapping, replace `binding.json` with that mapping (keeping `inspector.js` byte-identical so its hash still verifies), and add a line to the README: "Rebound to Palmetto's mapping of Sensor time-series v1. Core hash unchanged." Then the overview, the film and the video can say it honestly.
- **Fallback:** demo the rebind with the local loopback v0 (`POST /api/artifacts/:id/adopt`, which really rejects 1,439 rows and keeps 1,440), and change `#reuse` line 259 to "On her data, only the mapping changes."

### 6. Get one real agent build, or say plainly why not (60–120 min, the highest-risk item)
- On theme alone this matters more than anything except fixes 1–4. Options, in order:
  1. Redeem the Vercel AI Gateway credit from the 8090 email, or add a payment method if the owner is willing. Then run `BUILD_PROVIDER=eve` with `npm run agent:dev` and record the `eve-generated` artifact.
  2. Add a second provider in `startBuild` that calls a locally available coding CLI with `contract` plus the brief, submits through `acceptCandidate`, and loops on failed checks (max 3). This keeps the independent verifier intact. Label provenance as `agent-generated:<provider>`.
- If neither works by noon, say it on stage in one sentence ("The model provider blocked billing overnight, so you're seeing our reference build. Every station after it is live.") and keep the existing "Built from the offline reference template." label. Don't let a judge discover it.

### 7. Restore the audio brief: ElevenLabs prize plus "meeting transcripts" (40 min) — `web/main.ts`
- Add "Use a recording…" under the brief textarea. Pick an audio file, post it to the local `/api/audio-brief`, put the transcript into the textarea for the engineer to edit, then build. The backend already works and a real transcription succeeded.
- Pitch it as org context: "the brief can come straight from the meeting where someone asked for it". That is word-for-word on theme, and it is our only credible route to "Best Project Built with ElevenLabs".
- Fix README line 58 either way.

### 8. Opening 20 seconds of the demo video (10 min to rewrite; re-record shot 1)
| Time | Picture | Voiceover |
|---|---|---|
| 0:00–0:07 | Film ch. 01: agent finishing in VS Code (`?t=` near the end of the session) | "This is a software factory for a whole venture portfolio. An agent at Saildrone has just built a data-quality tool from a one-line brief." |
| 0:07–0:14 | Start view, built screen: the seven checks list, then the hash | "Before anyone else can see it, the factory runs seven checks on real ocean and solar data, and seals the exact version that passed." |
| 0:14–0:20 | Overview `#standard` table, Saildrone column beside Palmetto column | "Both companies mapped their data to the fund's shared standard. So the same tool runs at Palmetto, a solar company, with only the mapping swapped." |

Then continue with the existing plan from shot 6. Move signup, join and mapping (shots 3–5) after the payoff, and cut shot 5 first. Update shot 2, which quotes a hero that no longer exists. New close for shot 10: "Agents build against the fund's ontology. The factory checks what they build. Then it runs everywhere it fits."

### 9. README top and compliance (20 min) — `README.md`
- Replace lines 3–9 with the one-liner from section 1, the live URL, the "Explore a demo fund" link, and the factory line in seven numbered steps.
- Move the loopback v0 material under "Local builder (Node 26)" and delete the contradictions listed in section 2.
- Drop the `NEXT_FOR_CONNOR.md` link from the top.
- **Add the required "AI tools and libraries" section** with licenses (see section 5).

### 10. Store the 8090 requirement ID in provenance (20 min, Anushka's file) — `server/factory.ts`, `server/app.ts:80`
See section 3. Then station 1 of the factory section and the Devpost can say "linked back to its requirement in 8090".

### 11. Make the film show the factory (90 min; only if 1–7 are done) — `site/index.html`, `site/film/script.js`
- Turn captions on for chapter titles only, or put the three titles into the film's own frame text. Rename them:
  - 01 "The factory builds and checks it"
  - 02 "Shared by name, one exact version"
  - 03 "It runs wherever the data is mapped"
- In ch. 01, replace the agent's `npm test · 7 passed` lines with a separate "Common Ground checks" panel after the agent says it's done. Show one check failing (units-row, 1,439 rows), the agent repairing, then 7 of 7 and the hash.
- In ch. 03, retitle the map from "One ontology across the portfolio" to "Mapped to Sensor time-series v1". Drop the Intercom and Slack nodes and their concepts so the film matches the five-company demo fund. Replace the legend dots with words.

### 12. "Look before you build" (45 min; a creativity point if time allows) — `web/main.ts`
When the engineer clicks **Build and check**, first query the hosted registry for checked tools on the same contract. Show one line: "Saildrone already built telemetry-inspector against this standard. Open it instead?" That makes the ontology the factory's shared memory, which matches the "context layer that gives agents shared memory" starter idea word for word.

### Live 5-minute demo against the four criteria
| Min | Beat | Criterion it scores |
|---|---|---|
| 0:00–0:20 | The one-liner, plus the `#standard` table on screen | Demo/pitch, Creativity |
| 0:20–1:40 | VS Code: brief (audio if fix 7 lands) → 8090 requirement ID in the log → build → seven checks → hash | Technical execution, theme fit |
| 1:40–2:30 | Share this exact version with Maya by name. Cursor as Maya: it arrives with the Saildrone mark. Open it: hash verified, files saved, nothing runs. | Technical execution |
| 2:30–3:30 | Rebind on Palmetto's data: wrong units-row rejected (1,439), correct mapping keeps 1,440, core hash unchanged. Fault challenge: 1,438 rows, 3 missing, 1 duplicate. | Creativity, Technical execution |
| 3:30–4:20 | Fund console: the reuse just appeared, hours estimate, Standard page, sharing policy. Revoke the share live: Maya's next fetch is refused, her saved copy stays. | Enterprise impact |
| 4:20–5:00 | Close: "A factory per company builds the same tool forty times. A factory per portfolio builds it once." State what's real and what's sample in one sentence. | Demo/pitch, credibility |

Rehearse the revoke and the rebind at least once on the presentation machine. Those are the two moments a judge can't get from the video.

---

## 5. Factual inconsistencies a judge could catch

**Claims the product contradicts (fix or soften before submitting):**
1. "Only the exact checked version can be shared, identified by its SHA-256 hash" (Devpost), and "Each passed all seven checks" (`console.js:130`). Contradicted by: console **Add a tool** creates tools with a random 16-hex `hash` and `checks: 7` (`site/api/index.js:290`). The same server path defaults `checks` to 7 when the client omits them.
2. "Her inverter data already maps ... so only the binding changes" (`site/index.html:259`). Contradicted by: the hosted package ships the publisher's marine binding and the Saildrone CSV, and the recipient's mapping is never applied.
3. "Agents at your companies finish new internal tools" (hero), the film's agent session, and video shot 6. Contradicted by: no live agent build has succeeded, and every artifact is a `reference-template`.
4. Video plan shot 2 hero text, "Shared ontologies for your portfolio companies.", is not on the site.
5. The film's chapter titles are referenced in `DEMO-VIDEO.md` but are not visible (`data-captions="off"`).
6. The README describes a loopback, never-deploy, single-surface product with selectable identities. The live product is hosted with Google sign-in and a console.
7. README line 58 says "Audio brief in Build". That UI is gone from `web/main.ts`.

**Numbers and names:**
8. Companies: the film shows 7 (adds Intercom and Slack), while the overview and the demo fund show 5 (Saildrone, Palmetto, Mast, Groq, Netskope).
9. People: the film's handles are `@maya-sun` and `theo-tides`, while the demo seed uses `maya-pm` and `theo-sd`. The film shares with "Theo and Ines", `DEMO.md` and README with "Theo and Maya", and the gate with Theo, Maya, Elli and Leo. Surnames (Fabio Rossi, Maya Chen) appear only in the Devpost and the console.
10. Palmetto's mapping: the homepage table says `measured_on` / `ac_power__423` / local, while the demo console says `time` / `value` / `utc`.
11. Tests: `PRODUCT_BRIEF.md` says 9 automated tests, and the Devpost says 41 permission tests. Say "9 builder tests and about 41 hosted permission checks" once, the same way everywhere.
12. Hashes: the gate shows `a1f3c9e`, while the console shows the first 7 characters of real SHA-256s for seeded tools and random hex for hand-added ones. Use the real reference-build hash prefix on the site.
13. The demo fund numbers are consistent: 5 companies (3 live), 5 tools, 7 reuses, 106 estimated hours, and telemetry-inspector 16 h × 3 reuses = 48 h. That matches `#reuse` and `DEMO-VIDEO.md`. Keep it that way if fix 2 renames tools.
14. Data provenance: "Her inverter data" implies Palmetto's own data, but the data is public NREL PVDAQ, disclosed only in the footer. Add "public solar data standing in for Palmetto's" next to the claim.
15. The demo fund is named **Social Capital**, the judges' CEO's fund, with real portfolio favicons. `DEMO-VIDEO.md` says "Don't name a real fund in the live recording", but the demo fund itself does exactly that. Decide deliberately: it could charm or it could read as presumptuous. If you keep it, the "sample data" banner must stay in frame every time.

**Rules compliance (verified locally):**
- MIT `LICENSE` at the repo root: **present.**
- First commit `ef96850` at 2026-11-14 00:05 PT, after the Friday 6:30 PM start: **OK.**
- Committed keys: none found. Only `.env.example` is tracked, and a pattern scan for common key formats found nothing.
- **README does not list the AI tools and libraries used, with their licenses: missing, and required.** Add a short section naming the coding agents used to build the project (and their terms), the Eve agent framework, the model referenced in `agent/agent.ts`, QuickJS (`quickjs-emscripten`, MIT), the HydraDB SDK, the ElevenLabs API, the 8090 Software Factory API, and the data licenses (NOAA PMEL CC0, NREL PVDAQ CC BY 4.0). Check each license string against `package-lock.json` before pasting.

**Sponsor prizes, cheap wins:**
- **ElevenLabs:** restore the audio brief (fix 7). The backend is done and was verified live once. This is the only sponsor prize we can realistically contend for.
- **Vercel:** the site, API and extension sign-in already run on Vercel. Say so in the Devpost. AI Gateway is blocked by billing, so don't claim it.
- **HydraDB:** the adapter and `npm run hydra:seed` exist, but there is no key and the subscription was declined. Only worth 20 minutes if organisers hand out a key. In that case seed it and describe it as "company-scoped evidence behind the ontology", not as the access authority.
- **Composio:** no role. Don't add one for coverage. The brief already says so.
