# Connor: receiving-side recording brief

We are recording the real Common Ground two-laptop handoff. Anushka's agent controls and records her website and Cursor. Your responsibility is Connor's VS Code capture and delivery of the original footage. Preserve all other work. Do not reset companies, reseed projects, deploy, or update dependencies during the take.

## Before rolling

- Use the installed Common Ground 0.1.6 extension. Both laptops use the same hosted Common Ground service.
- Confirm Connor is signed in, with the new Palmetto company selected under Working company, in the same fund as Anushka's new ocean company. Do not use any older company.
- Verify the company's saved workflow brief and receiving settings. Source-side checks must show Connor as eligible before recording starts. Tell Anushka if company/fund identity differs; do not silently create more workspaces.
- Open Common Ground Start. Hide unrelated editor panels, private tabs, and notification previews. Have a parent folder ready for the downloaded project.
- Record the actual display with macOS Shift-Command-5 > Record Selected Portion. Frame the IDE including the new editor window when it opens. Options > Microphone > None; Save to Desktop. Use normal speed and hold readable states for three seconds.
- If ffmpeg is already installed, an alternative is scripts/demo-capture/record.sh. First run it with --list, select the Capture screen device, then `bash scripts/demo-capture/record.sh connor SCREEN_INDEX 240`. Do not assume a camera index is a screen.

## Coordination

1. Tell Anushka: 'Connor recording.' Keep recording continuously while her side shows the console and tool.
2. Wait for Anushka's spoken 'shared'. Then click Refresh companies in Common Ground.
3. Open the newly received Weather window planner. Show the sender and company for three seconds.
4. Open in editor > choose the parent folder > Save project here. Keep recording across the new-window transition.
5. In the NEW window: Command Palette > Common Ground: Open Start > Opened from Common Ground > Open project. Use the downloaded shared project, NOT the bundled Project examples preview.
6. Run project. Show the baseline result: 2 candidate windows, 5 usable hours, 2 excluded hours.
7. Change maximum wind from 8 to 4. Run project again. Show 0 candidate windows, 0 usable hours, 5 excluded hours.
8. Expand Assumptions and evidence and show the source hash. Keep recording for three seconds, then stop.

If an error occurs, keep the raw take. Report the exact screen and fix it before a new take; do not substitute a mock result or prepared preview for the downloaded tool.

## Deliver

Name the raw file `connor-take01.mov` (or .mp4 without changing its actual format). AirDrop it to Anushka's Mac. Her agent will inspect and edit it with her footage and add narration. Do not commit raw video, upload publicly, or submit Devpost from this task. No narration needed during capture.

The weather project is a prepared, checked reference example with synthetic inputs. It demonstrates real discovery, approval, delivery and execution. It must not be presented as generated live during the take. Company names represent illustrative scenarios, not company affiliation.
