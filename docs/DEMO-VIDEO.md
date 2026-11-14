# Common Ground demo runbook

Use **[DEMO-SCENARIO.md](DEMO-SCENARIO.md)** for the fictional companies, exact briefs, build prompt and onboarding order. Use **[RESET-AND-DEPLOY.md](RESET-AND-DEPLOY.md)** for the one-time purge and deployment. This runbook replaces the earlier Fabio/Maya and real-company staging instructions.

The payoff: **a tool built and checked for Pelagic Robotics runs at Helioforge Energy with the same source code and a different data binding.**

Say at the beginning: “Common Ground is a software factory that helps useful tools reach other teams in a portfolio.”

## Before presenting

- Finish onboarding, mappings and briefs offstage. Confirm both companies are in Meridian Frontier Fund.
- Confirm extension **0.1.3** is installed on both laptops and the corresponding site/API changes are deployed. Reload each editor. Merely having the VSIX file in the repository does not install it.
- Anushka's Working company is **Pelagic Robotics**. Connor's is **Helioforge Energy**. Before sharing, his inbox should contain no prior rehearsal tools.
- Confirm the local source builder is running and shows the intended live provider. An offline template must be described as a template.
- Run a full rehearsal and time generation. If it will not fit the five-minute slot, start with an actual previously completed build and explicitly say it was prepared before the presentation. Do not imitate a live generation step.
- Keep a known-good generated artifact and a recording of the successful run available. If the live build fails, disclose the failure and use that prepared artifact.
- Avoid opening the illustrative public seeded fund, which is a separate dataset from this two-person rehearsal.

## Five-minute live sequence

| Time | Operator and action | What to explain |
| --- | --- | --- |
| 0:00–0:30 | Anushka identifies Pelagic and Connor identifies Helioforge in their editor views. | “An ocean robotics team and a solar electronics team have different products. Both need trustworthy measurements.” |
| 0:30–1:45 | Anushka: **Build a tool… → Build and check** with the agreed prompt. Show actual progress. Use a disclosed prepared build if rehearsal timing requires it. | The factory records the requirement in 8090 when configured, generates code and runs its independent checks. Failures can trigger repairs. |
| 1:45–2:15 | Anushka shows passed checks and clicks **Run on the ocean sample**. | Show the actual measured result. Do not claim the tool establishes physical validity or mission success. |
| 2:15–2:55 | Anushka reviews the recipient suggestion and its evidence, selects Connor at **Helioforge Energy**, and clicks **Share this version**. | “The factory identifies a related need at another company. I approve this exact version for Connor.” Identify Hydra only when its evidence appears; do not relabel keyword matching as semantic retrieval. |
| 2:55–3:35 | Connor opens the offer in **Shared with you → Open in editor → Save project here**, choosing a fresh folder. | The tool arrives inside his editor and binds to his company's saved columns. Saving it does not execute it. |
| 3:35–4:35 | Connor returns to Common Ground and chooses **Run on solar sample** for the downloaded project. Show both result columns and the source hash. | The controlled altered sample removes three observations and duplicates one. The inspector should find **3 missing timestamps and 1 duplicate**. The original files are unchanged. The core code is the same checked version. |
| 4:35–5:00 | Leave the successful solar execution and hash visible. Optionally show the new reuse record if time allows. | “Pelagic built this for mission-data checks. Helioforge reused it for generation reports. Neither engineer needed to know the other's tool existed.” |

The live build's duration is variable. Compress narration or use the disclosed completed build; do not rush past the recipient execution, which is the strongest proof.

## Recorded submission: 2 minutes 45 seconds

Record the same sequence: 15 seconds of context, 45 seconds of build/checks, 30 seconds of evidence and approved sharing, 50 seconds of receiving and solar execution, and 25 seconds of interpretation/closing. If editing out waits, label the time compression. Keep the caption **Fictional portfolio; public NOAA and NREL datasets** visible where the companies/data are introduced.

## Honest answers to likely questions

- **What is the ontology today?** The supported time-series contract, each company's mapping to it, company membership and sharing rules, plus workflow briefs and reuse evidence. It is a narrow functioning implementation, not a universal enterprise ontology.
- **What does HydraDB do?** It indexes shared company briefs and retrieves relevant context inside permission-eligible company collections. Current source IDs/revisions constrain retrieval. Matching terms and recorded reuse remain available when retrieval is unavailable.
- **What does 8090 do?** It stores the requirement and provides a lineage reference. The local coding agent and runner generate and execute the code.
- **Can the fund read all portfolio code?** No. Fund administration does not grant blanket package download access. Recipients must have a current authorized share in the selected company.
- **Can a malicious client fake passed checks?** The current hosted service verifies package hashes and supplied check records; it does not independently rerun the suite or provide remote execution attestation. The actual demonstrated local factory runs the checks. Do not claim arbitrary client submissions are cryptographically attested.
- **How much time did this save?** We have a measured reuse event, not a measured counterfactual. Do not present the default “16 hours” or the dashboard's author-estimated hours as verified savings.
- **What happens on revocation?** Future authorized downloads stop. Previously downloaded files remain on the recipient's machine.
