# Demo plans: Common Ground

This file covers two things:
- **Part A:** the 2:45 recorded video required for Devpost.
- **Part B:** the live 5-minute judging demo, followed by 2 minutes of Q&A.

**The spine (say it, or a version of it, in the first 15 seconds of both):** "Common Ground is an ontological software factory for venture portfolios: agents build tools against the fund's shared data standard, not one company's columns, so any tool that passes the factory's checks can run at every company that has mapped its data."
**Spoken short form:** "One software factory for the whole portfolio."

**Claim only what's true on the day:**
- **8090 requirement record:** live.
- **Vercel hosting and functions:** live.
- **ElevenLabs Scribe:** live, via the Build view's "use a recording…" link (the transcript becomes an editable brief).
- **Claude Code agent:** live. It wrote a 120-line inspector in 36 seconds and passed all seven checks on the first attempt, labeled agent-generated.
- **HydraDB:** adapter only. Don't show it.
- **Composio:** no role.

---

# Part A: recorded video (2:45 target)

The plan is 10 shots and about 370 spoken words. At roughly 150 words a minute that's about 2:30 of voiceover, which leaves 15 seconds of pauses. Read the lines plainly.

**Source of each shot**
- **SITE**: the live site, https://common-ground-theta.vercel.app
- **CODE**: VS Code (sender, "Fabio") or Cursor (recipient, "Maya") with the extension installed
- **FILM**: b-roll from the overview page's autoplaying film. Add `?t=<seconds>` to freeze any moment. The film's chapter titles are hidden on the site (`data-captions="off"`), so add any titles in the edit. Chapter 01 is an agent session finishing in VS Code, 02 is the tool arriving in a teammate's Recent list, and 03 is the fund's graph, with a tool passing from Saildrone to Palmetto. Find in and out points by stepping `?t=` (`?t=26` is the chapter 02 still).

**Lower third** (shots 4 to 6): "Illustrative companies and people · public NOAA and NREL data"

| # | Time | Source | On screen | Voiceover |
|---|---|---|---|---|
| 1 | 0:00–0:07 | FILM | Chapter 01, near the end of the agent session (step `?t=` to the "Finished" moment). | "This is one software factory for a whole venture portfolio. An agent at Saildrone has just built a data-quality tool from a one-line brief." |
| 2 | 0:07–0:14 | CODE (VS Code) | The built screen: the seven green checks and "Passed all 7 checks." | "Before anyone else can see it, the factory runs seven checks on real ocean and solar data, and seals the exact version that passed." |
| 3 | 0:14–0:21 | SITE | Overview, the section "The ontology is the factory's context.", with the Saildrone and Palmetto mappings side by side. | "Both companies mapped their data to the fund's shared standard once. So the same tool runs at Palmetto, a solar company, with only the mapping swapped." |
| 4 | 0:21–0:50 | CODE (VS Code, Fabio) | Start, then **Build a tool…**, then the brief, then **Build and check**. Zoom on the log as it shows "8090 requirement recorded: …", "Coding agent (Claude Code) writing the tool from your brief.", any "Repair attempt 2…" line, then "7 independent checks passed." | "Here's the line. The brief is filed as a requirement in 8090's Software Factory before any code is written. The agent writes one function against the standard. It never sees Saildrone's column names. Seven checks it can't edit run it in a sandbox. If any fail, the failures go back to the agent to repair." |
| 5 | 0:50–1:05 | CODE (VS Code, Fabio) | **Share it**: hours 16. Untick "Everyone at Saildrone", tick **Maya Chen · Palmetto**, then **Share this version** and the notice. | "Fabio shares that exact version with one named person at another portfolio company. Not a channel, not a marketplace. One person, one version, and it expires in seven days." |
| 6 | 1:05–1:28 | CODE (Cursor, Maya) | Maya's Start view: "1 tool has been shared with you", with Saildrone's icon. Click **Open in editor**, pick a folder, and a new window opens. Open `binding.json` to show Palmetto's columns, then the README line "Rebound to Palmetto's mapping … Core hash unchanged", then `provenance.json` with the hash. | "At Palmetto, it's already in Maya's editor. She opens it. The checked code arrives byte for byte; only the binding is Palmetto's own. The hash verifies, the files land in a fresh folder, and nothing runs on download." |
| 7 | 1:28–1:50 | SITE | Fund console **Overview**: Recent reuse shows "telemetry-inspector · Maya Chen at Palmetto downloaded it", with the hours lede. Cut to the demo fund (sample banner visible) on **Tools**, showing the Reuses and Est. hours saved columns. | "The fund sees the reuse and an estimate of the hours it saved. Across a portfolio, that's a ledger a platform team has never had. A factory per company builds the same tool forty times. A factory per portfolio builds it once." |
| 8 | 1:50–2:12 | SITE (fast montage) | `/join/`: create the fund, then **Copy company link**. Second profile: "Bring your company into …", **Join**, then **Data**, **Solar sample**, "Passes", **Save mapping**, and Mapped. | "Getting there is two links. The fund sends one to its portfolio, and each company sends one to its engineers. A company maps its data to the standard once, in the browser, with nothing uploaded." |
| 9 | 2:12–2:27 | SITE | The fund's **Standard** page and its sharing policy card. Then Saildrone's tool page: **Revoke** Maya's share. | "The fund sets the limits: cross-company sharing, expiry, named recipients only, no resharing. And a revoke takes effect on the next request." |
| 10 | 2:27–2:45 | FILM, then end card | Chapter 03: the packet travels from Saildrone to Palmetto. End card: Common Ground · "One software factory for the whole portfolio." · common-ground-theta.vercel.app · Connor Hood, Anushka. | "Agents build against the fund's ontology. The factory checks what they build. Then it runs everywhere it fits. Common Ground. Try a demo fund at common-ground-theta dot vercel dot app." |

**Build-mode notes for shot 4**
- **Live Claude Code build** (the default for recording): the built screen says "Written by the coding agent from your brief." Use the voiceover as written.
- **Reference build** ("Built from the offline reference template."): change the shot 4 line to "...a reference build stands in for the agent here; the seven checks are the same", and caption it "Reference build shown; checks and sharing are live."
- **Audio brief (recommended, for the ElevenLabs prize):** open shot 4 with a recorded meeting clip turning into an editable brief, and add "The brief can come straight from the meeting where someone asked for it. ElevenLabs Scribe transcribes it. Voice never grants permission to share." Click "use a recording…" and pick a short clip of someone asking for the tool. Trim shot 8 to make room.

**If time runs short:** shorten shot 8 to the fund link only, then cut shot 9's first sentence. Never cut shots 1 to 3 or 6.

---

# Part B: live 5-minute judging demo (+2 min Q&A)

Two people. The driver is at a laptop with VS Code (Fabio), Cursor (Maya) and the browser. The speaker narrates and watches the clock. The tags show which judging criterion each minute serves: **[Tech]** technical execution, **[Impact]** enterprise impact, **[Creative]** creativity, **[Pitch]** demo and pitch.

| Time | On screen | Speaker | Criteria |
|---|---|---|---|
| 0:00–0:20 | Overview hero "An ontological software factory for your portfolio.", then scroll to the ontology section with Saildrone's and Palmetto's mappings. | The spine sentence, word for word. Then: "8090 builds the factory for one company. We built one whose context is the whole portfolio: the fund's shared ontology." | [Pitch] [Creative] |
| 0:20–1:40 | VS Code as Fabio: **Build a tool…**, the brief (click "use a recording…": ElevenLabs Scribe transcribes a short meeting clip into the brief box; edit one word on screen), **Build and check**. Narrate the log: "8090 requirement recorded", the agent writing, any repair attempt, then "7 independent checks passed." Click **Run on the ocean sample**: 1,440 readings, 55 missing values. | Idea to implementation, live. The requirement is filed in 8090 first. The agent writes one function against the standard's fields. Seven checks it can't edit run in QuickJS/WebAssembly (32 MB, 800 ms, no network or files) on real NOAA and NREL data. Name one trap: a wrong units-row assumption silently keeps 1,439 of 1,440 rows, and check 6 catches it. The passing version is sealed by hash. If the build shows "reference template", say so in one sentence. | [Tech] |
| 1:40–2:30 | VS Code: **Share it** with **Maya Chen · Palmetto** only. Cursor as Maya: the row appears (click Start if it hasn't within 8 s). **Open in editor**, and the new window opens. | Shared by name, one exact version. It was only allowed because both companies are mapped, the fund allows cross-company sharing, Palmetto accepts portfolio tools, and Fabio has the across-portfolio permission. It arrives where Maya already works. The hash verifies and nothing runs. | [Tech] [Pitch] |
| 2:30–3:30 | Cursor: open `binding.json` (Palmetto's own columns and local time), the README's "Rebound to Palmetto's mapping … Core hash unchanged", and `provenance.json` with the hash and the check record. | This is what the ontology buys. The code that passed at Saildrone is byte-identical at Palmetto. Only the binding is Palmetto's. A registry stores whatever you push. This factory only accepts tools built against the shared standard and passed by checks the author can't edit, and it rebinds them to the recipient's data. | [Creative] [Tech] |
| 3:30–4:20 | Browser: fund **Overview** shows the reuse that just happened and the hours lede, then **Standard** and the sharing policy. Then Saildrone's tool page: **Revoke**. Back in Cursor, click Start and the tool is gone; the saved folder stays. | The buyer is the fund's platform team. Every portfolio engineer's agent output becomes a fund asset, with a reuse ledger and estimated hours saved by company. The fund sets the outer limits, companies set their own, and revocation takes effect on the next request. | [Impact] |
| 4:20–5:00 | The film's chapter 03, or the end card. | "A factory per company builds the same tool forty times. A factory per portfolio builds it once." Then one sentence on what's real and what's sample: the demo fund is sample data, the datasets are public NOAA and NREL, and hours saved is an estimate. Judges can try it now with **Explore a demo fund** and the .vsix. | [Pitch] [Impact] |

**Fallbacks (decide before going on stage)**
- **Agent build fails or is slow (it can take minutes):** say so, and open the artifact built during pre-staging. In the extension that's Start > Recent; in the browser it's the console's tool page. Its checks and hash are already recorded. Keep a pre-built, agent-generated artifact ready.
- **Wi-Fi fails:** play the recorded video from shot 4 and narrate over it.
- **Maya's Start view doesn't update:** click Start. If it still doesn't, show Maya's console **Tools** > Shared with you.
- **A judge asks for scale:** open the pre-loaded demo fund tab (5 companies, 3 live, 5 tools, labeled sample data; Palmetto's Data page shows its real column shape, `measured_on` / `ac_power__423`, local time).

**Likely Q&A, with short honest answers**
- *"Is the agent really generating code?"* Claude Code writes the function headlessly, the same seven checks decide, and failures go back for up to three repairs. On its first live run it wrote 120 lines in 36 seconds and passed all seven checks first time. Every artifact is labeled with how it was produced.
- *"Isn't this a package registry?"* A registry takes whatever you push. This factory only accepts tools built against the shared standard that pass checks the author can't edit, and it rebinds them to each recipient's mapping. A registry can't tell you a Saildrone tool runs on Palmetto's data.
- *"What does 'ontology' mean here?"* The fund's shared data types (Sensor time-series v1), each company's mapping to them, and the tool contracts that read only those types.
- *"Where do tickets, emails and meetings come in?"* A brief can come from a meeting recording (ElevenLabs Scribe). Next is consented, company-scoped ingestion of tickets and past sessions, meeting at the same ontology.
- *"What stops a company leaking code?"* Exporting needs a per-person permission. Recipients are named people only. There's no resharing, shares expire, the receiving company must opt in, and access is re-checked on every read. The fund can't download company code either.
- *"Can someone skip the checks by registering a tool by hand?"* No. A hand-registered tool has zero checks and can't be shared. Publishing requires all seven to pass, and the hash is verified on upload and download.
- *"How do you know hours saved?"* We don't. It's an estimate (reuses times the author's build hours), labeled as one. A pilot would measure it.

---

# Recording and stage checklist (both parts)

**Accounts**
- [ ] Account A: fund owner and Saildrone owner ("Fabio"). Owners automatically have Can share and Across portfolio.
- [ ] Account B: Palmetto owner ("Maya").
- [ ] Use the console's **Profile** menu to set display names to "Fabio Rossi" and "Maya Chen".
- [ ] Give the live fund a clearly made-up name (e.g. "EVOLVE Demo Fund"). The demo fund is named Social Capital. Keep its "sample data" banner in frame whenever it's on screen.

**Pre-stage**
- [ ] Account A creates the fund at `/join/`, joins with the company link as **Saildrone** (saildrone.com), and maps with **Ocean sample**.
- [ ] Account B joins as **Palmetto** (palmetto.com) and maps with **Solar sample**. A portfolio share is refused until both companies are mapped, and Palmetto's mapping is what the rebind writes into `binding.json`.
- [ ] Fund **Standard**: Network on, Cross-company on, expiry 7. Palmetto **Sharing**: Your company and the portfolio, with Saildrone on.
- [ ] Sender laptop: clone the repo and run `npm ci`. Put `SOFTWARE_FACTORY_API_KEY` in `.env` so the 8090 line appears in the log, set `BUILD_PROVIDER=claude`, check that `claude` is on the PATH and signed in, then run `npm start` (Node 26). Start should say "The local builder is running." Time one build. The first live build took 36 seconds, but allow for slower runs.
- [ ] Install https://common-ground-theta.vercel.app/download/common-ground.vsix in **VS Code** (Fabio) and **Cursor** (Maya). Use two editor apps, because the sign-in token is stored per editor.
- [ ] Sign in to each editor through the default browser's current session: browser as A, then sign in from VS Code. Then sign out on the site, sign in as B, and sign in from Cursor.
- [ ] Rehearse in a separate rehearsal fund with its own two companies. The fund's Recent reuse list keeps old events, and reuse counts once per person per tool. Delete the rehearsal orgs afterwards (each one's **Settings** > Delete).
- [ ] Keep one agent-built, already-checked artifact in Fabio's Recent as the stage fallback.
- [ ] Maya's editor needs a trusted workspace or an empty window. Prepare a parent folder (e.g. `~/Desktop/received`).
- [ ] Open a private browser tab on the demo fund: `/signin/` > **Explore a demo fund**.
- [ ] Rehearse the rebind (`binding.json`) and the revoke on the presentation machine. Those are the two moments a judge can't get from the video.

**Screens**
- [ ] Record at 1920×1080, 30 fps. Use a browser window around 1440×900 at 110–125% zoom.
- [ ] Editors full screen at `window.zoomLevel` 1, with no minimap, a clean profile and notifications off. On stage, check readability from the back of the room.
- [ ] Use the same light or dark theme everywhere. Keep emails, tokens and invite codes on screen only briefly.

**Edit (Part A)**
- [ ] Record the voiceover one shot per take, then cut the picture to the audio. Add the lower third and any build-mode caption.
- [ ] Export 1080p MP4 under 3:00, upload it (unlisted YouTube is fine), and paste the link into Devpost.
