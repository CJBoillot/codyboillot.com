# codyboillot.com

A single-page personal site for Cody J. Boillot, built as one self-contained `index.html`
(HTML + embedded CSS + a few lines of vanilla JS). No build step, no dependencies.

## Files

| File | Purpose |
|------|---------|
| `index.html` | The entire site. |
| `assets/headshot.jpg` | Your photo. **Drop your file here** (see below). |
| `resume.pdf` | Backs the "Download résumé" button. |
| `CNAME` | Tells GitHub Pages to serve `codyboillot.com`. |
| `.nojekyll` | Tells GitHub Pages to serve files as-is. |

## Before you ship: 2 quick edits

1. **Add your photo.** Save it as `assets/headshot.jpg` (portrait, ~800×1000px looks best).
   You can delete `assets/PUT-HEADSHOT-HERE.txt`. If no photo is present, the site shows a
   styled "CB" monogram automatically, so nothing breaks.
2. **Set your LinkedIn link.** In `index.html`, search for `REPLACE-ME` and swap in your real
   LinkedIn handle (one spot, near the bottom).

## Preview locally

Just double-click `index.html`, or run a tiny static server from this folder:

```powershell
# Python
python -m http.server 8080
# then open http://localhost:8080
```

## Deploy to GitHub Pages

1. Create a new GitHub repo (e.g. `codyboillot.com` or `cody-site`).
2. Push these files to the `main` branch:
   ```powershell
   git init
   git add .
   git commit -m "Launch personal site"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```
3. In the repo: **Settings → Pages → Build and deployment**.
   Set **Source = Deploy from a branch**, **Branch = `main` / `(root)`**, then **Save**.
4. Wait ~1 minute. Your site is live at `https://<your-username>.github.io/<your-repo>/`
   (or directly at your custom domain once DNS is set; see below).

## Custom domain (codyboillot.com)

The `CNAME` file already requests `codyboillot.com`. At your DNS provider, point the domain
at GitHub Pages:

- **Apex domain `codyboillot.com`** → four `A` records:
  ```
  185.199.108.153
  185.199.109.153
  185.199.110.153
  185.199.111.153
  ```
  (Optional, recommended) also add `AAAA` records for IPv6:
  ```
  2606:50c0:8000::153
  2606:50c0:8001::153
  2606:50c0:8002::153
  2606:50c0:8003::153
  ```
- **`www` subdomain** → one `CNAME` record pointing to `<your-username>.github.io`.

Then in **Settings → Pages → Custom domain**, enter `codyboillot.com`, save, and tick
**Enforce HTTPS** once the certificate is issued (can take a few minutes to an hour).

> You currently host on AWS. Switching DNS to the records above will move the live domain to
> GitHub Pages. Leave the AWS site up until the new one resolves, then decommission it.

## Want Vercel instead/later?

This works on Vercel with zero config: import the GitHub repo at vercel.com → Deploy.
Add `codyboillot.com` under the project's **Domains** and follow Vercel's DNS instructions
(you'd use Vercel's records instead of the GitHub ones above; don't point at both).
