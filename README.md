# Leetpros website

leetpros.com as a static site: two hand-built ERPNext pages, plus a self-hosted copy of the
older Framer pages. Packaged as a Next.js static export.

## The two kinds of page

**Hand-built** (`/` and `/erpnext`): plain HTML in `content/pages/`, marked `<html data-lp>`.
They share one stylesheet and one small script in `public/lp/`, and are assembled at build time
from the pieces in `content/partials/` (navigation, footer, icons, head). They carry no Framer
code and read fine with JavaScript off. Edit them like any HTML file.

**Mirrored** (about, pricing, contact, projects, blog, legal): Framer's own pre-rendered HTML
with its fonts, images and runtime script, so they look and animate as they did on Framer.
Framer's script redraws these pages after load, so **edits to their HTML do not stick**. The one
change made to them is done by script: `public/lp/framer-nav.js` adds the "ERPNext" link to
their navigation bar.

The Framer home page that `/` used to show is kept, unrouted, in `content/legacy/home-framer.html`.

## Layout

| Path | What it is |
| --- | --- |
| `content/pages/index.html`, `erpnext.html` | The hand-built pages |
| `content/partials/*.html` | Shared pieces, pulled in with `<!--include:name-->` |
| `public/lp/` | Stylesheet, script, logo, link-preview pictures for the hand-built pages |
| `content/pages/**` (the rest) | Mirrored Framer page HTML, one file per route |
| `public/_fr/**` | Mirrored Framer assets: images, fonts, runtime chunks, CMS data |
| `lib/pages.ts` | Loads a page; assembles hand-built ones (includes and slots) |
| `pages/_document.tsx` | Emits each page's `<head>` and `<body>` unchanged |
| `scripts/og-card.html` | Source of the link-preview pictures |
| `scripts/harvest.py` | Re-downloads the old Framer site. See the warning below |
| `reach/` | Local only, gitignored. See "Reach version" |

## Commands

```bash
npm install
npm run build     # static site in out/
npm start         # preview out/ (it prints the address; port 3000 if free)
```

**Do not run `npm run harvest`.** It re-pulls the old Framer site and would overwrite
`content/pages/index.html`, the new home page, with the old one.

## Reach version

The pages have slots (`<!--slot:erp-proof--><!--/slot-->`) where proof will go once it exists:
client counts, case studies, testimonials. The published site leaves them empty. The local
folder `reach/` holds an invented, aspirational version of that proof as a target; it is
gitignored and is only built with `LP_REACH=1 npm run build`. `reach/README.md` lists what has
to become true before each block can move into `content/`.

## Deploy

GitHub Pages: push to `main`; `.github/workflows/pages.yml` builds and deploys. The site needs to
sit at the root of its address, because assets use root paths like `/_fr/...`, so the repository
is the organisation site `leetpros/leetpros.github.io`, with `leetpros.com` as its custom domain
(set in the repository's Pages settings).

## Known gaps

- **Forms** on the mirrored contact page and the newsletter box post to `api.framer.com`. They
  stop working when the Framer site is unpublished. Point them at a form service before
  cancelling Framer, or replace `/contact` with a hand-built page.
- The mirrored pages still describe the older agency offer (their pricing page in particular).
- Framer's on-page editor bar is disabled in the mirrored runtime.
