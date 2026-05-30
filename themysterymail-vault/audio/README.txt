Audio files for QR / standalone vault pages (not the main username → password flow).

Structure:
  audio/<case-slug>/<filename>.mp3

Current:
  audio/case-2/transmission.m4a           →  forward playback
  audio/case-2/transmission.mp3           →  forward fallback
  audio/case-2/transmission-reversed.m4a  →  reverse playback (pre-rendered)
  audio/case-2/transmission-reversed.mp3  →  reverse fallback
  case-2-audio.html swaps between the two hidden players — no Web Audio API.
