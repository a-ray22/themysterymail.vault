JPEG previews for the Case 2 hint page:

  themysterymail-vault/hints/case-2-lost-in-the-himalaya/assets/pages/

`hints.html` references these paths. Thumbnails are blurred so players can match props, not read fine print.

Regenerate from SVG masters (light blur only — sigma=6, max width 520px). Example for one file:

  rsvg-convert -w 640 "SOURCE.svg" -o /tmp/c2.png
  ffmpeg -y -hide_banner -loglevel error -i /tmp/c2.png -vf "scale=min(iw\,520):-2,gblur=sigma=6" -q:v 4 "DEST.jpg"

Brahmi symbol PNGs (answers section — exact game clusters):

  hints/case-2-lost-in-the-himalaya/assets/brahmi/unique_maroon/

Source art: Lost in the Himalaya playable pack (Notes/, assets/Police/, assets/Intro/, assets/Final/, brahmi_character_pngs/).
