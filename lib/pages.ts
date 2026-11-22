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
  const html = fs.readFileSync(path.join(PAGES_DIR, `${name}.html`), "utf8");

  const htmlTag = html.match(/<html([^>]*)>/i)?.[1] ?? "";
  const htmlAttrs: Record<string, string> = {};
  for (const [, k, v] of htmlTag.matchAll(/([\w-]+)(?:="([^"]*)")?/g)) htmlAttrs[k] = v ?? "";

  const head = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? "";
  const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? "";
  return { htmlAttrs, head: patchHead(head), body };
}

/** Drop head tags that Next.js already emits or that are useless off Framer,
 *  and load the CMS range shim (public/framer-cms-range.js) before Framer's runtime. */
function patchHead(head: string): string {
  return '<script src="/framer-cms-range.js"></script>\n' + head
    .replace(/<meta charset="[^"]*">\s*/i, "")
    .replace(/<meta name="viewport"[^>]*>\s*/i, "")
    .replace(/<link href="https:\/\/fonts\.gstatic\.com" rel="preconnect"[^>]*>\s*/i, "");
}
