import fs from "node:fs";
import path from "node:path";

const PAGES_DIR = path.join(process.cwd(), "content", "pages");

export type MirroredPage = {
  htmlAttrs: Record<string, string>;
  head: string;
  body: string;
};

/** All mirrored routes as slug arrays, e.g. [] for "/", ["blog", "x"] for "/blog/x". */
export function listRoutes(): string[][] {
  const walk = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)],
    );
  return walk(PAGES_DIR)
    .filter((f) => f.endsWith(".html"))
    .map((f) => path.relative(PAGES_DIR, f).replace(/\\/g, "/").replace(/\.html$/, ""))
    .filter((r) => r !== "404")
    .map((r) => (r === "index" ? [] : r.split("/")));
}

export function loadPage(slug: string[]): MirroredPage {
  const name = slug.length ? slug.join("/") : "index";
  const raw = fs.readFileSync(path.join(PAGES_DIR, `${name}.html`), "utf8");
  const handBuilt = /<html[^>]*\sdata-lp[\s=>]/i.test(raw);
  const html = handBuilt ? assemble(raw) : raw;

  const htmlTag = html.match(/<html([^>]*)>/i)?.[1] ?? "";
  const htmlAttrs: Record<string, string> = {};
  for (const [, k, v] of htmlTag.matchAll(/([\w-]+)(?:="([^"]*)")?/g)) htmlAttrs[k] = v ?? "";

  const head = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? "";
  const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? "";
  // Hand-built pages carry no Framer runtime, so they skip the Framer head patch.
  return { htmlAttrs, head: handBuilt ? head : patchHead(head), body };
}

const PARTIALS_DIR = path.join(process.cwd(), "content", "partials");
const REACH_DIR = path.join(process.cwd(), "reach");

/** Hand-built pages (marked `<html data-lp>`) are put together from shared pieces:
 *
 *  - `<!--include:nav-->` pulls in `content/partials/nav.html`.
 *  - `<!--slot:proof-->fallback<!--/slot-->` keeps the fallback in the published site.
 *    Built with `LP_REACH=1`, it is replaced by `reach/proof.html` when that file
 *    exists. `reach/` is untracked: it holds draft sections for local preview. */
function assemble(html: string): string {
  const reach = process.env.LP_REACH === "1";
  return html
    .replace(/<!--slot:([\w-]+)-->([\s\S]*?)<!--\/slot-->/g, (_all, slot: string, fallback: string) => {
      const file = path.join(REACH_DIR, `${slot}.html`);
      return reach && fs.existsSync(file) ? fs.readFileSync(file, "utf8") : fallback;
    })
    .replace(/<!--include:([\w-]+)-->/g, (_all, part: string) =>
      fs.readFileSync(path.join(PARTIALS_DIR, `${part}.html`), "utf8"),
    );
}

/** Drop head tags that Next.js already emits or that are useless off Framer,
 *  load the CMS range shim (public/framer-cms-range.js) before Framer's runtime,
 *  and load the script that adds the "ERPNext" link to the mirrored navigation. */
function patchHead(head: string): string {
  return '<script src="/framer-cms-range.js"></script>\n<script defer src="/lp/framer-nav.js"></script>\n' + head
    .replace(/<meta charset="[^"]*">\s*/i, "")
    .replace(/<meta name="viewport"[^>]*>\s*/i, "")
    .replace(/<link href="https:\/\/fonts\.gstatic\.com" rel="preconnect"[^>]*>\s*/i, "");
}
