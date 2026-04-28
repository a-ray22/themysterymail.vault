# Deploy this project to GitHub

This folder is its **own** Git repository (separate from any repo in parent folders).

## 1. Create an empty repository on GitHub

1. Log in at [github.com](https://github.com).
2. **New repository** (green button or **+** → New repository).
3. Name it (e.g. `themysterymail-vault` or `puzzle-website`).
4. Leave **empty** — no README, no .gitignore, no license (you already have files locally).
5. Create the repository.

## 2. Connect and push (run in this folder)

**Always run Git from this folder** (`Desktop/Puzzles/Website`) so you use this repo’s `.git`, not any other Git repo on your machine.

Replace `YOUR_USER` and `YOUR_REPO` with your GitHub username and repo name.

```bash
cd /Users/arayjadhav/Desktop/Puzzles/Website
git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
git branch -M main
git push -u origin main
```

Set your real identity for commits (once per machine, or only in this repo):

```bash
git config user.name "Your Name"
git config user.email "you@example.com"
```

If GitHub shows **SSH** instead:

```bash
git remote add origin git@github.com:YOUR_USER/YOUR_REPO.git
```

## 3. (Optional) Publish the vault on GitHub Pages

The playable site lives in **`themysterymail-vault/`**.

1. Repo on GitHub → **Settings** → **Pages**.
2. **Build and deployment** → Source: **Deploy from a branch**.
3. Branch: **main** → Folder: **`/themysterymail-vault`** (if that option exists) or **`/ (root)`** if you move vault files to repo root later.
4. Save. After a minute or two, the site URL will look like:  
   `https://YOUR_USER.github.io/YOUR_REPO/`  
   (exact path depends on whether you use a `/docs` or subfolder setup — GitHub’s UI labels the options clearly.)

If Pages only offers **`/ (root)`** or **`/docs`**, either:

- put the contents of `themysterymail-vault` at the repository root, or  
- use **Netlify / Cloudflare Pages** and set the **publish directory** to `themysterymail-vault` (often simpler for a subfolder project).

## 4. Future updates

```bash
cd /Users/arayjadhav/Desktop/Puzzles/Website
git add -A
git status   # review
git commit -m "Describe your change"
git push
```
