# codyboillot.com

A personal site for Cody J. Boillot. The home page is one self-contained `index.html`
(HTML + embedded CSS + a few lines of vanilla JS). No build step, no dependencies.

`/SkillTrainer` is a separate app on the same site: a skill-tree training engine.
See [SkillTrainer](#skilltrainer) below.

## Files

| File | Purpose |
|------|---------|
| `index.html` | The home page, in full. |
| `404.html` | Site-wide not-found page. Also redirects wrong-case URLs to `/SkillTrainer/`, `/ClickToConquer/`, `/FactoryAFK/` and `/BattlePass/`. |
| `assets/headshot.jpg` | The portrait on the hero. Falls back to a "CB" monogram if missing. |
| `assets/favicon.svg` | Browser tab icon, used by both the home page and SkillTrainer. |
| `resume.pdf` | Backs the résumé button. |
| `SkillTrainer/` | The training-engine demo. |
| `ClickToConquer/` | Click to Conquer, an idle survival-crafting game (Firebase cloud saves). |
| `BattlePass/` | Battle Pass: The Game, a satirical idle game about live-service monetization. Copied from its own project; local saves only for now (`cloud-config.js` is empty on purpose). |
| `FactoryAFK/` | Factory A.F.K., an idle factory game. Built from one game file; `cloud.js` + `cloud-config.js` add Google sign-in and Firestore saves (Firebase project `factory-afk`). |
| `CNAME` | Tells GitHub Pages to serve `codyboillot.com`. |
| `.nojekyll` | Tells GitHub Pages to serve files as-is. |

## Preview locally

SkillTrainer uses native ES modules, which browsers refuse to load over `file://`.
Serve the folder over HTTP rather than double-clicking:

```powershell
npx --yes serve -l 8080 .
```

Then open <http://localhost:8080>. The home page alone still works from `file://`.

## SkillTrainer

A training engine modeled on the pre-NGE Star Wars Galaxies skill window.

The catalogue is three levels deep, all on one page:

```
Software Engineering        section
  └─ AWS                    sub-section
       └─ AWS Lambda        skill tree
            └─ Authoring    category (column)
                 └─ II      module (tier)
```

Sections are collapsed by default and expand in place. There is no per-section page: big
section cards spent a lot of vertical space to show a name and a count, then charged a
navigation to see what was inside. Old `#/s/<id>` links still work and open that section.

A sub-section with a **blank name** is meaningful, not a placeholder: its trees sit directly
under the section with no heading, which is what a section with no sub-divisions looks like.

A tree has a Novice module, 2 to 6 **categories** (columns), and a Master module.

### Nothing is locked; completion is what's ordered

Every module is readable at any time, in any order. Read ahead, skim the whole tree, jump
to whatever you need today. There is no gate on content.

What is ordered is **completion**. A module turns green only when its quiz is passed, and
its quiz can only be attempted once the module below it is green. So the tree stays
browsable while the credential stays earned. Boxes read:

| Outline | State | Meaning |
|---|---|---|
| neutral | pending | Readable now. The quiz opens once the tier below is green. |
| **orange** | available | The quiz can be taken. |
| **green** | complete | Quiz passed. |

The order is: Novice, then tier I of any category, then each tier needs the one below it,
and Master needs tier IV of every category. The "ignore prerequisites" toggle in the top
bar bypasses the ordering, which is how you test a quiz halfway up a tree.

### The tier ladder

Every category has exactly **four** tiers, and the four mean the same thing everywhere:

| | Level | Meaning |
|---|---|---|
| **I** | Basic Awareness | You know it exists, what it is for, and when it comes up. |
| **II** | Foundational | You can do it with guidance, and you spot it going wrong. |
| **III** | Skilled | You do it unsupervised and make sound calls in ordinary situations. |
| **IV** | Advanced | You handle the hard cases, set the standard, and teach it. |

The depth is fixed, not configurable. That is the point: it makes "Design III" and
"Risk III" comparable statements about someone's level rather than two unrelated positions
in two unrelated stacks. `TIERS` and `TIER_LEVELS` in `js/schema.js` are the single source.

### Naming

A category names every tier in it, exactly as in the game: `Injection I`, `Injection II`,
`Injection III`, `Injection IV`. That name is **derived** from the column rather than
stored on each module, so renaming a category renames its whole stack and the two can never
drift apart. Category titles are capped at 26 characters so the numeral still fits on a box.

A module's own `title` is its **topic**: what that particular tier covers. It is optional,
and it appears on the module page and in the column rail, never on a lattice box. Novice
and Master have no category, so their `title` is what shows on their box (capped at 32).

### Editing is password-gated

Visitors read; authors edit. The lock in the top bar asks for a password, checked against a
SHA-256 hash in `js/config.js`. The default is **`skilltree`**, and that file explains how
to generate a different one.

**This is not security and does not pretend to be.** The site is static, the hash ships in
the source, and anyone with devtools can bypass it. It stops a visitor idly rewriting the
trees; it protects nothing. The content is public either way. Deep links to the editor
route are gated too, so it is not a UI-only check.

### Saved content

Text, structure and quizzes live in `localStorage`. Uploaded **images, documents and
video** go to **IndexedDB**, which is measured in hundreds of megabytes rather than
localStorage's ~5 MB, and content refers to them as `asset:<id>`.

Exports bundle every referenced file as base64, so a pack is self-contained: export it,
drop it in `content/packs/`, and the images and PDFs travel with it. That does make packs
large, which is the honest cost. "Remove unused files" in the Content menu drops assets
nothing refers to any more.

### YouTube costs you nothing

YouTube blocks render as a **click-to-play facade**: the page shows the thumbnail YouTube
already hosts and only loads the player when someone presses play. YouTube serves both the
image and the video, so no video data comes off this site either way, but an unwatched
video costs one image instead of a whole embedded player. A per-block setting switches to
"thumbnail that links out" if you would rather not embed at all.

### A module is seven fixed sections

Not a free-form list of blocks. Every module has the same shape, and each section
collapses independently (the open/closed choice is remembered):

| Section | Holds |
|---|---|
| **Main Article** | The core prose. Rich text. |
| **Links** | External reading. |
| **Videos** | YouTube, an uploaded file, or any embed URL. |
| **Images** | Diagrams and screenshots. |
| **Docs** | Downloadable documents. |
| **Articles** | Further pieces beyond the main one. |
| **Quiz** | Passing it is what marks the module complete. |

Sections with nothing in them are not rendered, so a module never shows an empty Videos
heading.

### Rich text

Main Article and each Article use a built-in editor: bold, italic, underline,
strikethrough, headings, bulleted and numbered lists, quotes, code blocks, links, three
fonts (sans, serif, mono), four sizes, and **note boxes** in four tones that stand out from
the surrounding prose.

Content is stored as HTML and **sanitised on every render**, not on save. An imported pack
is untrusted input, so the renderer rebuilds it from a tag-and-attribute whitelist:
`<script>`, event handlers, `javascript:` and `data:` URLs, iframes, inline styles, SVG and
forms are all stripped, while the editor's own markup survives a round trip intact.

There is no server and no login. Content lives in `localStorage`; progress does too.

### Installing content

Content is plain JSON, so shipping a course is a commit:

1. Author it in the browser, then **Content → Export** from the top bar.
2. Drop the file into `SkillTrainer/content/packs/`.
3. Add one line to `SkillTrainer/content/manifest.json`.

No code changes. Packs merge in order: a tree whose `id` already exists is replaced, and
sub-sections merge by `id` or by name, so a pack can drop a tree into a sub-section another
pack defined. `security.json` does exactly that, adding its tree to Software Engineering's
Core Practice.

Packs declare a `schemaVersion`. Older ones are migrated on load, so a pack written against
the original block-based model still works: `js/schema.js` holds the migration chain, and
the two packs shipped here are still v1 on disk and migrate to v2 every time they load.
`content/packs/security.json` exists as a worked example of exactly that, and can be
deleted by removing the file and its manifest line.

Media is referenced by URL or repo-relative path (`assets/diagram.png`), which keeps packs
portable and puts real files in git. The editor also accepts small image uploads as data
URIs, but `localStorage` caps at roughly 5 MB, so anything sizeable belongs in the repo.

### Layout

```
SkillTrainer/
  index.html        app shell
  css/              tokens.css (light + dark palettes), app.css
  js/
    schema.js       the content model, limits, and the migration chain
    store.js        state, localStorage, progress, import/export
    assets.js       uploaded files in IndexedDB
    richtext.js     the editor and its HTML sanitiser
    auth.js         the edit-mode password gate
    view-*.js       browse, tree lattice, module reader
    quiz.js         quiz runtime and grading
    editor.js       authoring for every level
  content/          manifest.json + packs/
  assets/           images and downloads referenced by packs
```

### What can be created, edited and deleted

| | Create | Edit | Delete | Notes |
|---|---|---|---|---|
| Section | yes | yes | yes | Deleting keeps its trees |
| Sub-section | yes | yes | yes | Reorder, and move trees between them |
| Tree | yes | yes | yes | Also duplicate, and assign to many sections |
| Category | yes | yes | yes | 2 to 6 per tree; rename cascades to all four tiers |
| Module | — | yes | — | Fixed: four per category, plus Novice and Master |

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
