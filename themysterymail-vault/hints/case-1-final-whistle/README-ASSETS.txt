JPEGs for the hint page live here:

  themysterymail-vault/hints/case-1-final-whistle/assets/pages/

`hints.html` references these paths. Extra print-only pages are **not** linked in the guide (no broken `<img>` tags for them):

  - Escape room invite: only `a5-stage-1-invtation-p1.jpg` and `p2` (not p3/p4).
  - Riddle sheet: only `a5-stage-1-riddle-p1.jpg` (not p2).

**Blur pipeline (regenerate after swapping masters):** caps width then blurs (stronger than blur-only). From repo root:

  for f in themysterymail-vault/hints/case-1-final-whistle/assets/pages/*.jpg; do
    ffmpeg -y -hide_banner -loglevel error -i "$f" -vf "scale=min(iw\\,380):-2,gblur=sigma=28" -q:v 5 "/tmp/h-blur.jpg" && mv "/tmp/h-blur.jpg" "$f"
  done

That overwrites each file with a web-safe blurred copy (keep print masters outside git).
