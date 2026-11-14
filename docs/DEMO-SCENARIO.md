# Meridian Frontier Fund demonstration

**Fictional portfolio; public NOAA and NREL datasets.** These proposed names are demo identities, not verified unique business names. Do not imply a relationship with Ulysses, Optivolt, Saildrone, Palmetto, or any actual fund.

| Workspace | Operator | Illustrative business |
| --- | --- | --- |
| Meridian Frontier Fund | Anushka | An investment fund backing companies that build frontier hardware. |
| Pelagic Robotics | Anushka | Autonomous underwater robots for seabed mapping and ecosystem restoration. |
| Helioforge Energy | Connor | Adaptive solar power electronics for reliable generation under changing conditions. |

## Why these companies would reuse the same tool

Pelagic needs to inspect incoming observations before evaluating a mission. Helioforge needs trustworthy measurements before comparing solar-system performance. The hardware and business goals differ; both workflows depend on complete, non-duplicated time-series observations. Common Ground builds and checks the inspector, proposes an eligible recipient, and delivers the same code with the recipient's data binding after the author approves.

The prototype checks data completeness. It does not control robots, optimize solar power, validate physical measurements, prove mission success, or certify equipment safety. NOAA ocean observations and NREL solar measurements stand in for these fictional companies' inputs; they are not proprietary robot or panel telemetry.

## Company workflow briefs

Save each brief **after its company exists**, under that company's **Get started** page. A fund workspace cannot hold the company brief. Missing companies after the purge are expected; do not restore old memberships or invent company IDs to make the save succeed.

**Pelagic Robotics — Anushka**

> We review buoy observations before publishing daily research summaries. Gaps and repeated readings can make a deployment look healthier than it is. We need to check the incoming observations before evaluating the mission.

**Helioforge Energy — Connor**

> We reconcile inverter exports before closing daily generation reports. Missing intervals and duplicate measurements distort the totals. We need to check the measurements before comparing system performance.

These are authored demonstration requirements, not claims about real companies' internal needs. Recommendation quality must be checked in rehearsal. The UI may use Hydra retrieval, matching workflow terms, recorded reuse, or a combination; explain the evidence actually returned.

## Build prompt — Anushka

> Build a CSV telemetry completeness inspector. Detect missing timestamps, duplicate readings and off-grid observations. Distinguish missing or malformed values from valid zeros. Preserve the supplied time basis without guessing a timezone. Follow Sensor time-series v1.

## Exact setup order

1. Connor finishes deployment and the authorized hosted purge using `RESET-AND-DEPLOY.md`. Do not run the purge again once the new companies and rehearsed build should be retained.
2. Both install extension **0.1.3**, reload the editor, and clear old Common Ground local history. Use the same live service URL on both laptops.
3. Anushka creates **Meridian Frontier Fund** at `/join/?kind=fund`.
4. Anushka copies its **company invitation**, then uses **Set up my own company** to create **Pelagic Robotics** inside that fund.
5. Connor opens the fund company invitation and creates **Helioforge Energy**. Do not send or use Pelagic's engineer invitation for this step.
6. Check the fund's Portfolio lists both companies. Anushka administers Pelagic; Connor administers Helioforge. Neither needs to join the other company as an engineer.
7. Anushka maps the ocean sample in Pelagic. Connor maps the solar sample in Helioforge. Save the respective briefs above. With the Hydra key and database configured in the deployed service, these saves start indexing the company briefs.
8. Both sign into the extension. Select the correct **Working company** if prompted. The source machine runs `npm start`; receiving and running the downloaded solar tool do not require Connor to run a builder.
9. Perform one complete build → check → ocean run → recipient suggestion → share → save → solar run rehearsal before presenting. Record the actual build duration.

If credentials are configured but no companies exist yet, the next action is step 3, not another database change. Do not treat successful API authentication as proof that the new company briefs have been indexed; they must be created, saved, and queried.
