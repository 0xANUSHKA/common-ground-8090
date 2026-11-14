# Five minutes, one surface

**Audience and promise:** pitch to a fund's operating/platform team; show the portfolio-company engineer's IDE workflow. “Software factories build tools. Common Ground makes those tools useful across the portfolio.” Our demo is marine → solar, using public data and illustrative participation. See [the shared product brief](PRODUCT_BRIEF.md) for precise claims and release gates.

## Before the room
Start the backend; install the VSIX; open Common Ground: Start. Enlarge editor font/zoom if needed. Use two editor windows (or switch demo identities) representing Fabio and Maya. Both use the SAME extension. Explain that identities and participation are illustrative. Run a full rehearsal once. Prefer an already verified live-generated artifact if a live model is configured; explicitly label any offline reference run.

## 0:00–0:35 — The problem
“Software factories make tools cheap. But discovering that somebody already built the useful part is still expensive. We make the factory's output find its next purpose—inside the editor people already use.”

Show a finished telemetry inspector. No introductory graph dashboard. Briefly reveal passing checks and the source hash. If using offline mode, say “This is our reference tool; distribution, verification and adaptation are running live.”

## 0:35–1:20 — Real work
Run NOAA's mission 1045 day. 1,440 records, 55 missing wind measurements. Zero missing row timestamps. Explain the distinction. The system proposes only Theo and Maya: one colleague, one eligible person at an opted-in portfolio company. Leo's task does not match; Elli lacks permission.

## 1:20–2:10 — The tiny interface
Approve sharing the exact source version. Switch to Maya. A small company icon now sits beside telemetry-inspector in Recent. Hover to reveal Fabio. “It feels like my agent made something useful. It didn't need to be my agent.”

## 2:10–3:20 — Reuse that understands the difference
Open, adapt. The inherited units-row assumption yields 1,439 solar rows; the verifier catches the lost midnight observation. The explicit recipient binding retains all 1,440 rows and keeps unresolved local time local. Show the unchanged core hash. This is reusable computation plus a verified recipient binding, not copying a project and hoping.

## 3:20–4:20 — Make it fail on purpose
Run fault challenge. Three minutes disappear, one repeats. The real executor reports 1,438 rows, 3 missing timestamps, 1 duplicate. The public source fixture remains unchanged. Open the actual downloaded project in the editor, including source, binding, provenance and data.

## 4:20–5:00 — Control and close
Use Theo's still-unopened offer to demonstrate Receiving Off. Local projects remain, the offer disappears, and the backend rejects new fetches. The API test log separately proves unauthorized publishing and cross-company denial.

“The factory doesn't end at build. It ends when useful, verified software reaches the next person who is allowed to use it.”

## Accuracy notes
- Public company sources document historical backing, not a verified current fund portfolio.
- Public NREL data is not Palmetto customer data. No real company adoption is asserted.
- Negative solar power is not automatically an error. No physical-quality claim is made.
- The recipient binding is schema-driven in this v0, not a general autonomous adapter generator.
- HydraDB retrieval, ElevenLabs transcription and live generation require successful credential setup; do not announce an integration as live until exercised.
