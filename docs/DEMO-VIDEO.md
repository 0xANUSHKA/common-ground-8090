# Demo video plan: Common Ground (2:45 target)

The plan is 10 shots and about 360 spoken words. At roughly 150 words a minute that's 2:25 of voiceover, which leaves about 20 seconds for pauses and on-screen beats, for a cut of 2:40 to 2:55. Read the lines plainly. Don't add sponsor names or claims that aren't in [DEVPOST.md](DEVPOST.md).

**Source of each shot**
- **SITE**: screen capture of the live site, https://common-ground-theta.vercel.app
- **CODE**: screen capture of VS Code (sender) or Cursor (recipient) with the extension installed
- **FILM**: b-roll from the overview page's autoplaying film. Add `?t=<seconds>` to freeze any moment, for example https://common-ground-theta.vercel.app/?t=26. The film has three chapters: 01 an agent session finishes, 02 a teammate's Recent list shows the tool arriving, 03 the fund's graph of companies, with a tool passing from Saildrone to Palmetto. The title sequence runs about 5 seconds, and `?t=26` is the still of chapter 02. Find the exact in and out points by stepping `?t=`.

**Lower third for the whole video** (small, bottom left, first 10 s and again over shots 6 to 8): "Illustrative companies and people · public NOAA and NREL data"

---

## Shot list

| # | Time | Source | On screen | Voiceover |
|---|---|---|---|---|
| 1 | 0:00–0:13 | FILM | Chapter 01: the agent session ticking to "Finished · 2h 14m", the tool done. Hold on the finished state. | "Every week, engineers at fast-moving companies have an agent build them a tool. It works. Then it lives on one laptop, and the company next door builds the same thing again." |
| 2 | 0:13–0:25 | SITE | Overview page: the hero "Shared ontologies for your portfolio companies.", then a slow scroll to "One standard. Everyone joins through it." | "That isn't a technology problem. It's a communication and distribution problem. We fix it where the leverage is: a venture fund and its portfolio." |
| 3 | 0:25–0:40 | SITE | `/join/`, already signed in as the fund owner. Type the fund name, click **Create fund**, and land on the console's "Set up your portfolio" steps. Click **Copy company link** and show the toast. | "The fund signs up with Google and gets one link, which it sends to its portfolio companies. There's no individual plan. Access flows from the fund, to its companies, to their engineers." |
| 4 | 0:40–0:58 | SITE | Second browser profile, as the Palmetto admin, opening the company link: "Bring your company into …". Enter Palmetto, palmetto.com, **Join**. You land on **Data**. Click **Solar sample** to show the columns, time basis "Local, no timezone", cadence, and "Passes". Click **Save mapping** and the pill changes to Mapped. | "A company joins and maps its data to the fund's standard: time, value, unit, cadence. The sample is checked in the browser, and nothing is uploaded. Once a company is mapped, tools built anywhere in the portfolio can run on its data." |
| 5 | 0:58–1:05 | SITE | Saildrone's **Team** page: the Can share, Across portfolio and Receives switches. Flip **Across portfolio** on for Fabio. | "Each company decides who can share, who can share outside the company, and who receives." |
| 6 | 1:05–1:25 | CODE (VS Code, Fabio) | Start view, then **Build a tool…**. The brief is prefilled. Click **Build and check**. The log streams, then the seven green checks appear. Zoom on the check list. | "Now the engineer, in VS Code. His tool is finished. Before anyone else can see it, it runs seven checks in a sandbox against public NOAA ocean data and NREL solar data: missing timestamps, duplicates, zero versus missing, and a wrong units-row assumption." |
| 7 | 1:25–1:40 | CODE (VS Code, Fabio) | The **Share it** section. Set hours to 16. Untick "Everyone at Saildrone" and tick **Maya Chen · Palmetto**. Click **Share this version** and show the "Shared … with Maya Chen" notice. | "He shares this exact version, identified by its hash, with one named person at another portfolio company. Not a channel, not a marketplace. One person, one version, and it expires in seven days." |
| 8 | 1:40–2:00 | CODE (Cursor, Maya) | Maya's Start view: "1 tool has been shared with you" and a row with Saildrone's icon reading "Fabio Rossi · Saildrone". Click it to show the detail ("passed all 7 checks… nothing runs until you choose to run it"). Click **Open in editor**, pick a folder, and a new window opens showing `inspector.js`, `binding.json`, `provenance.json`, `README.md` and the CSV. | "In Maya's editor, it's already there, marked with Saildrone's icon. She opens it. The extension checks the hash and saves the files into a fresh folder. Nothing runs on download, and if the share is revoked, future access stops." |
| 9 | 2:00–2:25 | SITE | Fund console **Overview**: Recent reuse shows "telemetry-inspector · Maya Chen at Palmetto downloaded it", and the lede shows hours saved. Cut to the demo fund (sample banner visible) on **Tools**, with the Reuses and Est. hours saved columns. Then **Standard**, then the **Sharing policy** card. | "Back at the fund, that reuse is counted, along with an estimate of the hours it saved: the number of reuses times the author's own build time. Across a portfolio, that's a number a platform team has never had. And the fund sets the limits: cross-company sharing, expiry, named recipients only, and no resharing." |
| 10 | 2:25–2:45 | FILM, then end card | Chapter 03: the fund graph, with the packet traveling from Saildrone to Palmetto. Then an end card on the background colour: Common Ground · common-ground-theta.vercel.app · "Explore a demo fund" · Connor Hood, Anushka. | "A shared standard is what lets one company's breakthrough run at another. A feature in the editor is what gets it there. Common Ground is both. Try a demo fund at common-ground-theta dot vercel dot app." |

**If shot 6 uses the offline reference build** (the Start view says "Built from the offline reference template."), keep the voiceover as written. It says the tool is finished and doesn't claim an agent wrote it live. Add a small caption: "Reference build shown; the checks and sharing are live." If a live agent build succeeds before recording (the view says "Built by the agent from your brief."), you can say "His agent finishes the tool" instead.

**If time runs short:** cut shot 5 (7 s), then shorten shot 2 to its first sentence. Don't cut shot 8 or 9. Those are the payoff.

---

## Capture notes per shot

- **Shots 1, 2, 10 (FILM and SITE):** open https://common-ground-theta.vercel.app in a clean browser window. For stills, use `?t=` values. For motion, let the film play and trim afterwards. Chapter 03 is the last chapter, so play from about `?t=30` and let it run to the end.
- **Shot 3:** sign in to the fund owner account in the browser before recording, so no Google account picker or email address appears on screen. If you'd rather not make a new fund on camera, you can record the same steps against the fund made during pre-staging. In that case the steps card won't show, and you start at the sidebar's "Invite portfolio companies" > **Copy invite link**.
- **Shot 4:** use a second browser profile, signed in as the Palmetto admin. The invite URL looks like `/join/?invite=…`. After joining, the site goes straight to the company's **Data** page.
- **Shot 5:** Saildrone's console: `/dashboard/#/<saildroneId>/team`.
- **Shots 6 to 8:** see the checklist. Both editors need to be visible and signed in as different people before you start.
- **Shot 9, real fund:** `/dashboard/#/<fundId>/overview`. **Demo fund:** in a third, private window, open https://common-ground-theta.vercel.app/signin/ and click **Explore a demo fund**. It shows the banner "This is a private demo fund with sample data." Leave that banner in frame. Its numbers are 5 companies (3 live), 5 tools, 7 reuses and an estimated 106 hours. Then go to **Tools** and **Standard** in the sidebar.

---

## Recording checklist

**Accounts (two real Google accounts at minimum)**
- [ ] Account A: fund owner and Saildrone owner (the sender, "Fabio"). A company owner automatically gets both Can share and Across portfolio.
- [ ] Account B: Palmetto owner (the recipient, "Maya").
- [ ] In each account, open the console, go to the **Profile** menu (bottom left), and set the display names to "Fabio Rossi" and "Maya Chen" so the story matches the film and the demo fund. Alternatively, keep your real names and change the voiceover names.
- [ ] Use a made-up fund name that's clearly fictional (e.g. "EVOLVE Demo Fund"). Don't name a real fund in the live recording.

**Pre-stage (do the whole loop once, then reset what you'll repeat on camera)**
- [ ] Account A creates the fund at `/join/` and copies the company link.
- [ ] Account A joins with that link as **Saildrone** (saildrone.com, for the favicon) and saves a verified mapping with **Ocean sample**.
- [ ] Account B joins as **Palmetto** (palmetto.com). Either map now, or leave mapping for shot 4. A portfolio share is refused until both companies are mapped, so if you leave it, do shot 4 before shot 7.
- [ ] Fund **Standard** page: Network on, Cross-company sharing on, expiry 7 days.
- [ ] Palmetto **Sharing** page: receives from "Your company and the portfolio", with Saildrone switched on.
- [ ] Sender machine: clone the repo, run `npm ci`, and start the local builder with `npm start` (Node 26). Leave it running. The Start view should say "The local builder is running."
- [ ] Install `https://common-ground-theta.vercel.app/download/common-ground.vsix` in **VS Code** (Fabio) and **Cursor** (Maya). Use two different editors, because the sign-in token is stored per editor app. VS Code Insiders also works for the second one.
- [ ] Sign in to each editor in turn. Sign-in uses the default browser's current session: sign the browser in as A, click **Sign in to Common Ground** in VS Code, then sign out on the site, sign in as B, and click sign in in Cursor.
- [ ] Do one full dry run first (build, share with Maya, open in Cursor), but in a separate rehearsal fund with its own two companies. Deleting a tool resets its counts, but the fund's "Recent reuse" list keeps the old event. Reuse is also counted only once per person per tool, so each take needs a freshly shared tool. When you're done, delete the rehearsal fund and its companies (each one's **Settings** > Delete). Otherwise the extension's Share section shows a company picker and extra people.
- [ ] Maya's editor needs a trusted workspace, or an empty window, for downloads. Have a parent folder ready (e.g. `~/Desktop/received`) for the "Save project here" dialog.
- [ ] Shot 8 refreshes on its own every 8 seconds while Start is open. If you don't want to wait on camera, click back to **Start** to refresh.

**Screens and windows**
- [ ] Record at 1920×1080 at 30 fps. Use a 1440×900 browser window centred on screen and zoom to 110–125% so console text is readable.
- [ ] VS Code and Cursor: full screen at 1920×1080, `window.zoomLevel` 1. Hide the minimap, close side panels, and turn off other extensions' notifications (Do Not Disturb).
- [ ] Use a clean browser profile with no bookmarks bar, extensions or other tabs. Do the same on the OS: hide the dock, turn off notifications, and use a plain desktop.
- [ ] Use light or dark theme, but the same in both editors and the browser.
- [ ] Make sure no email addresses, tokens or invite codes are on screen longer than a moment. The invite URL in shot 3 is fine to show briefly. Blur it if you're publishing the video after the hackathon.

**Audio and edit**
- [ ] Record the voiceover separately, in a quiet room, one shot per take. Cut the picture to the audio.
- [ ] Add the lower third ("Illustrative companies and people · public NOAA and NREL data") and, if needed, the reference-build caption on shot 6.
- [ ] Export as 1080p MP4 and keep it under 3:00. Upload it to YouTube (unlisted is fine) and paste the link into Devpost.
