#!/bin/bash
# Card images for the prototype site (960x540 JPEG on the paper colour). Usage (from prevumo): bash kit/shots.sh
set -e
out=public/shots; mkdir -p $out
bg=0xF3EBDD
wide() { ffmpeg -y -loglevel error -i "$1" -vf "crop=iw:iw*9/16:0:0,scale=960:540:flags=lanczos" -q:v 3 "$out/$2.jpg"; }
wide deliverables/pd-b3/8-owner-app.png owner-app
wide deliverables/pd-b3/6-system-overview.png system
for n in 1-welder:welder 2-printer:printer 3-enclosed-printer:enclosed-printer 4-multimaker:multimaker 5-laser-cutter:laser-cutter; do wide deliverables/pd-b3/${n%%:*}.png ${n##*:}; done
# the manual is a tall phone shot: set it on the paper colour
ffmpeg -y -loglevel error -i deliverables/pd-b3/7-qr-manual-phone.png -vf "crop=iw:iw*1.15:0:0,scale=-2:500:flags=lanczos,pad=960:540:(ow-iw)/2:20:color=$bg" -q:v 3 $out/manual.jpg
ffmpeg -y -loglevel error -i deliverables/prevumo-dashboard-desktop.png -vf "crop=iw:iw*9/16:0:0,scale=960:540:flags=lanczos" -q:v 3 $out/dashboard.jpg
ls -la $out
