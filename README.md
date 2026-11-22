# Leetpros website

A self-hosted copy of the leetpros.com Framer site, packaged as a Next.js static export.

Every page is Framer's own pre-rendered HTML, served with all its CSS, fonts and images, so
layout, typography and the three breakpoints (≥1200px, 810–1199px, <810px) match the original
exactly. Framer's runtime JS is also mirrored, so appear/scroll animations, hover states, the
mobile menu, carousels/tickers and client-side page transitions behave as they do on Framer.
Nothing is loaded from Framer's servers; the only third-party script is Google Analytics.

## Layout

| Path | What it is |
| --- | --- |
| `scripts/harvest.py` | Re-downloads the live Framer site and all assets, rewriting URLs to local paths |
| `content/pages/**.html` | Mirrored page HTML (one file per route) |
| `public/_fr/**` | Mirrored assets: images, fonts, Framer runtime chunks, CMS data |
| `pages/_document.tsx` | Emits each mirrored page's `<head>`/`<body>` unchanged |
| `pages/[[...slug]].tsx` | One static route per mirrored page (Next.js ships no client JS) |
| `public/framer-cms-range.js` | Serves Framer's `?range=` CMS reads (blog/project lists) from static files |

## Commands

```bash
npm install
npm run build     # static site in out/
npm start         # preview out/ at http://localhost:3000
npm run harvest   # re-pull from the live Framer site (only while it's still published)
```

If you change the site in Framer before cancelling, run `npm run harvest` then `npm run build`.

## Deploy

**GitHub Pages (free):** push to `main`; `.github/workflows/pages.yml` builds and deploys. In the
repo's Settings → Pages, set Source to "GitHub Actions" and add the custom domain
(`www.leetpros.com`). A custom domain (or a `<user>.github.io` repo) is required: assets use
root paths like `/_fr/...`, which break under a `/<repo>/` project-page subpath.

**Cloud Run:**

```bash
gcloud run deploy leetpros --source . --region us-central1 --allow-unauthenticated
```

The `Dockerfile` builds the export and serves it with nginx on port 8080 (`nginx.conf` maps
`/about` → `about.html` and sets long cache headers on hashed assets).

## Known gaps

- **Forms** (contact, newsletter) still post to `api.framer.com`. They will stop working when the
  Framer site is unpublished. Point them at a form service (Formspree, Web3Forms, or a small
  Cloud Run endpoint) before cancelling.
- Framer's on-page editor bar is disabled in the mirrored runtime.
