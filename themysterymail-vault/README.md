# The Mystery Mail Vault

Visual styling matches **[themysterymail.com](https://www.themysterymail.com)** (warm cream background `#fdfcf7`, ink text `#1a1b29`, maroon accent `#7d2222`, Wix export palette). The header uses your brand assets in **`images/logo.png`** and **`images/favicon.png`** (copied from the project `Images/` folder — replace those files if the logo updates). Header links to the main shop; **Vault** stays on this player flow.

**Case 1 (Vault 2)** (`case-1-vault-2.html`): **not** linked from the vault home — players reach it via **QR on the physical puzzle** (or the direct URL you print). Four **numeric-only** cells (two digits max each), then **Decode letter** with a short reveal animation. Images: **`images/case-1-vault-2/`** (see `images/README.txt`).

Static vault flow for envelope games:

1. **Landing** (`index.html`) — player enters the **username** printed in the envelope.
2. **Password** (`password.html?game=…`) — **one box per part** of the code. How many boxes appear is controlled **per game** (see `passwordSegments` below). Each box allows up to **2 characters** by default (letters or digits), **not case sensitive**. Use `passwordMaxCharsPerCell` on a game if you ever need a different limit (1–8).
3. **Directory** (`directory.html?game=…`) — simple **Windows-style** window with **Kabir's Digital Directory** and openable files (content comes from `data/games.json`).

## First game (Case 1)

| Field | Value |
|--------|--------|
| **Username** (put on envelope / marketing) | `KABIR-VAULT-M7K2` |
| **Password** (6 boxes) | `CJ` · `54` · `7` or `07` · `CE` · `47` · `25` |
| **Reveal in** `Case File Envelope.txt` | Second envelope code **223** |

To change copy or codes, edit **`data/games.json`** only.

## Password length per game

The number of input boxes equals **`passwordSegments.length`**.

- **Case 1** uses **6** entries → **6** boxes.
- A future game could use **8** (or more) entries → that many boxes.

Example with eight parts:

```json
"passwordSegments": ["AA", "BB", "CC", "DD", "EE", "FF", "GG", "HH"]
```

Optional per-game override:

```json
"passwordMaxCharsPerCell": 2
```

(Omit it to keep the default of **2**.)

## Adding a new game

1. Open `data/games.json`.
2. Add a new object to the `games` array, for example:

```json
{
  "id": "case-2-your-handle",
  "title": "Case 2 — Working Title",
  "username": "UNIQUE-USERNAME-ON-ENVELOPE",
  "passwordSegments": ["X1", "Y2", "Z3"],
  "directoryRootLabel": "Kabir's Digital Directory",
  "files": [
    {
      "name": "readme.txt",
      "content": "Your next clue text here."
    }
  ]
}
```

3. Deploy again (or push to Git — see below).

Rules:

- **`id`**: unique, URL-safe (letters, numbers, hyphens). Used in `?game=`.
- **`username`**: what players type on the home page (compared case-insensitively).
- **`passwordSegments`**: array of expected values, **one per box**. Length = number of boxes. Use `""` only if a box must stay empty for that game.
- **`files`**: list of fake files; each can be opened in the directory UI.

## Hosting (best for “I’ll send you prompts” updates)

You want: **edit JSON → live site quickly → easy for you or an assistant to apply changes from chat.**

**Recommended setup: GitHub + Netlify (or Cloudflare Pages)**

1. Create a **GitHub** repo and put the `themysterymail-vault` folder in it (or make the repo this folder’s root).
2. Sign up at **Netlify** or **Cloudflare Pages**, **Connect to Git**, pick the repo.
3. Set **publish directory** to `themysterymail-vault` if the repo root is your whole `Website` project; if the repo *is* only the vault, publish **`.`** (root).
4. Turn on **deploy on push** to `main` (default).

Then your workflow is:

- You (or Cursor after a prompt) change **`data/games.json`** (new game, new username, new `passwordSegments` length, new file text).
- **Commit + push** → the host rebuilds in about **one minute** → players see the update.

That is the smoothest way to pair with **prompt-driven edits**: the assistant edits JSON in-repo; you merge/push; no manual drag-and-drop each time.

**Acceptable but slower:** Netlify **manual deploy** (drag zip). Fine for rare changes; worse for frequent prompt iterations.

**Local preview:**

```bash
cd themysterymail-vault
npx --yes serve .
```

This site uses `fetch("data/games.json")`, so use **http://localhost** or **HTTPS** in production — not `file://`.

## Security (important)

All checks run in the **browser**. Anyone can open DevTools or read `games.json`. That is normal for puzzle / envelope immersion, not for real secrets.

## Optional: reset session when testing

Session state uses `sessionStorage`. Close the tab, or in DevTools → Application → Session Storage → clear keys starting with `tmv_`.
