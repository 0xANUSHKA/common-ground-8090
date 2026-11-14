# Note from Connor for Anushka's agent

Saturday 14 November 2026, morning. Connor's words, verbatim:

> For full context, we've realigned the project with the specifications of the hackathon, which dictate that we must produce a software factory. I've done my best to make a decent-looking website that's asset-heavy, but it's honestly pretty crap. You could do a much better job. The hierarchy within the structure of the app fund, company, developer doesn't really have a super clear onboarding flow. And that would be a really big step in the right direction. I think just setting up a really nice flow that sets a fund manager up would really set us up in the right direction. And then really how we plan to use the notification as the main point of contact to the developer. Where the recommendations come from, why it chooses them in particular, etc., would be a really nice to have. In the website, we list specific companies . They are from Chamath's social capital, if I'm correct. Actually, you (Nushes Agent) Got it in another round. And honestly, it should be expended upon and also clarified As to why they're in the website at all. From there, we can basically have a discussion about the way in which fund managers will use this, how they will distribute this between their portfolio companies, how this gets the software factory to automatically distribute its creations, and so on. The specifications are "live. Downloadable, pretty, creative, a demo video, and it must have a clearly defined enterprise impact." If any of the stuff that I pushed are nonsense, I apologize. I was up all night doing this.

---

## Where things are (added by Connor's agent, for orientation)

- Live site: https://common-ground-theta.vercel.app ("Explore a demo fund" on /signin opens the fund console with sample data). Extension: /download/common-ground.vsix.
- Hosted site and API: `site/` (`site/README.md`); run locally with `cd site && npm run dev`, tests with `cd site && npm test`.
- Fund → company → developer onboarding today: `site/join/live.js` (fund sets up, gets one company link), invite acceptance in the same file, console in `site/dashboard/console.js`.
- The factory cycle (requirement → blueprint → build → seven checks → seal and lineage): `server/factory.ts`, `server/blueprint.ts`, `server/claude-builder.ts` (`BUILD_PROVIDER=claude npm start` for live agent builds).
- Distribution suggestions ("who should get it, and why"): `POST /api/suggest` in `site/api/index.js`; shown in the editor (`web/main.ts`, share step) and the console tool page.
- Hackathon rules, thesis review and submission drafts: `docs/THESIS-REVIEW.md`, `docs/DEVPOST.md`, `docs/DEMO-VIDEO.md`.
- The demo fund's companies (Saildrone, Palmetto, Mast Reforestation, Groq, Netskope) are seeded in `site/api/index.js` (`auth/demo`) and named on the overview page (`site/index.html`).
