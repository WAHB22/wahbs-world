#!/bin/bash
# Builds the summary video (public/video/prevumo-summary.mp4): slides from the deck PDF as cards, with the two films between them.
# Run from prevumo/ after node final/film.mjs all and the deck PDF export.
set -euo pipefail
PDF=deliverables/final/PREVUMO-final.pdf
OUT=public/video
WORK=final/build/summary
rm -rf "${WORK:?}" && mkdir -p "$WORK" "$OUT"
card() { # page seconds name
  pdftoppm -f "$1" -l "$1" -scale-to-x 1920 -scale-to-y 1080 -png "$PDF" "$WORK/p$1"
  ffmpeg -y -loglevel error -loop 1 -t "$2" -i "$WORK"/p$1*.png -vf "fps=30,format=yuv420p,fade=t=in:st=0:d=0.3,fade=t=out:st=$(echo "$2 - 0.3" | bc):d=0.3" -c:v libx264 -preset slow -crf 20 "$WORK/$3.mp4"
}
card 1 3.5 c1
card 3 4.5 c3
card 7 4.5 c7
card 9 5.5 c9
card 11 4.0 c11
for f in hardware software; do ffmpeg -y -loglevel error -i final/media/$f.mp4 -vf "fps=30,scale=1920:1080,format=yuv420p" -c:v libx264 -preset slow -crf 20 "$WORK/$f.mp4"; done
ffmpeg -y -loglevel error -i "$WORK/c1.mp4" -i "$WORK/c3.mp4" -i "$WORK/hardware.mp4" -i "$WORK/software.mp4" -i "$WORK/c7.mp4" -i "$WORK/c9.mp4" -i "$WORK/c11.mp4" \
  -filter_complex "[0:v][1:v][2:v][3:v][4:v][5:v][6:v]concat=n=7:v=1:a=0,format=yuv420p[v]" -map "[v]" -c:v libx264 -profile:v high -preset slow -crf 21 -r 30 -movflags +faststart "$OUT/prevumo-summary.mp4"
ffmpeg -y -loglevel error -ss 1.5 -i "$OUT/prevumo-summary.mp4" -frames:v 1 -q:v 3 "$OUT/prevumo-summary.jpg"
cp video-src/index.html video-src/video.css "$OUT/"
ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT/prevumo-summary.mp4"
ls -la "$OUT"
