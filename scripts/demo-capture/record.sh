#!/usr/bin/env bash
# Record one Mac screen, without microphone/system audio. No network or upload.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
if ! command -v ffmpeg >/dev/null; then
  echo 'ffmpeg is not installed. Use Shift-Command-5 → Record Selected Portion instead.'
  echo "Save the recording under: $ROOT/artifacts/demo-takes/"
  exit 1
fi
if [ "${1:-}" = '--list' ]; then
  ffmpeg -hide_banner -f avfoundation -list_devices true -i '' 2>&1 || true
  exit 0
fi
ROLE="${1:-}"; DISPLAY_INDEX="${2:-}"; SECONDS_TO_RECORD="${3:-120}"
case "$ROLE" in anushka|connor) ;; *) echo 'Usage: bash scripts/demo-capture/record.sh anushka|connor SCREEN_INDEX [SECONDS]'; echo 'Find SCREEN_INDEX with: bash scripts/demo-capture/record.sh --list'; exit 1;; esac
case "$DISPLAY_INDEX" in ''|*[!0-9]*) echo 'Choose the index labelled Capture screen, not a camera.'; exit 1;; esac
case "$SECONDS_TO_RECORD" in ''|*[!0-9]*) echo 'Duration must be seconds.'; exit 1;; esac
if [ "$SECONDS_TO_RECORD" -lt 5 ] || [ "$SECONDS_TO_RECORD" -gt 360 ]; then echo 'Choose 5–360 seconds.'; exit 1; fi
DEST="$ROOT/artifacts/demo-takes"
mkdir -p "$DEST"
OUT="$DEST/${ROLE}-$(date +%Y%m%d-%H%M%S).mp4"
echo "Recording $ROLE for $SECONDS_TO_RECORD seconds; screen index $DISPLAY_INDEX. No microphone."
echo 'Put only the demo window on this screen, hide notifications, and leave credentials closed.'
echo 'Starting in 5 seconds. Press q in this terminal to finish early.'
sleep 5
ffmpeg -hide_banner -loglevel warning -f avfoundation -capture_cursor 1 -framerate 30 -i "$DISPLAY_INDEX:none" -t "$SECONDS_TO_RECORD" -an -vf 'scale=1920:1080:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1' -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p -movflags +faststart "$OUT"
echo "Saved: $OUT"
echo 'Review this file before transferring it. Do not commit footage to Git.'
