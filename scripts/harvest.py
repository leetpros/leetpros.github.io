"""Mirror the published Framer site (leetpros.com) into this Next.js project.

Downloads every page in the sitemap plus every asset they reference (images,
fonts, runtime JS chunks, search index), stores the assets under public/_fr/
and rewrites all remote URLs to local root-absolute paths.

Usage:  python scripts/harvest.py
Output: content/pages/<route>.html   (rewritten page HTML)
        public/_fr/...                (assets)
"""

import hashlib
import os
import re
import subprocess
import sys
import urllib.parse
from concurrent.futures import ThreadPoolExecutor

SITE = "https://www.leetpros.com"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGES_DIR = os.path.join(ROOT, "content", "pages")
ASSET_DIR = os.path.join(ROOT, "public", "_fr")
ASSET_PREFIX = "/_fr"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"

# Hosts whose files we mirror locally.
MIRROR_HOSTS = ("framerusercontent.com", "fonts.gstatic.com")

# Matches absolute URLs to mirrored hosts, in plain or JSON-escaped (\/) form.
URL_RE = re.compile(
    r"https:(?:\\?/){2}(?:framerusercontent\.com|fonts\.gstatic\.com)"
    r"(?:\\?/[^\s\"'`()<>,\\]*)+(?:\?[^\s\"'`()<>,\\]*)?"
)
# Relative ES module imports inside .mjs chunks.
IMPORT_RE = re.compile(r"""(?:from|import)\s*\(?\s*["'`](\.{1,2}/[^"'`]+\.mjs)["'`]""")
# CMS data URLs built at runtime, e.g.
#   new URL(`./x-chunk-default-0.framercms`,`https://framerusercontent.com/modules/.../x.js`).href.replace(`/modules/`,`/cms/`)
NEW_URL_RE = re.compile(
    r"new URL\(`(\.{1,2}/[^`]+)`,`(https://framerusercontent\.com/[^`]+)`\)"
    r"(\.href\.replace\(`/modules/`,`/cms/`\))?"
)
# After rewriting, `new URL(rel, "/_fr/...")` needs an absolute base to not throw.
LOCAL_BASE_RE = re.compile(r"(new URL\(`[^`]+`,)(`/_fr/)")
# Framer's on-page editor bar (loads framer.com/edit/init.mjs). Disable it by
# moving its value to an unused prop so the router receives EditorBar: undefined.
EDITOR_BAR_RE = re.compile(r"EditorBar:(\w+===void 0\?void 0:)")

# Scripts that only make sense on Framer's hosting.
STRIP_PATTERNS = [
    re.compile(r'<script[^>]*src="https://events\.framer\.com/[^"]*"[^>]*>\s*</script>\s*'),
    re.compile(r'<script>try\{if\(localStorage\.getItem\("__framer_force_showing_editorbar_since"\).*?</script>\s*', re.S),
]


def fetch(url, allow_error_status=False):
    # curl uses the OS certificate store, which is more reliable than Python's.
    flags = "-sSL" if allow_error_status else "-sSfL"
    r = subprocess.run(
        ["curl", flags, "--retry", "3", "-A", UA, url],
        capture_output=True, timeout=120,
    )
    if r.returncode != 0:
        raise RuntimeError(r.stderr.decode(errors="replace").strip())
    return r.stdout


def normalize(raw):
    """Turn a matched URL (maybe JSON-escaped / HTML-escaped) into a real URL."""
    return raw.replace("\\/", "/").replace("&amp;", "&")


def local_path(url):
    """Map a remote URL to a local root-absolute path. Query-string variants
    (e.g. ?scale-down-to=512) become distinct files."""
    p = urllib.parse.urlsplit(url)
    host = "gfonts" if p.hostname == "fonts.gstatic.com" else ""
    path = p.path
    if p.query:
        base, ext = os.path.splitext(path)
        q = re.sub(r"[^A-Za-z0-9]+", "-", p.query).strip("-")
        if len(q) > 60:
            q = hashlib.sha1(p.query.encode()).hexdigest()[:16]
        path = f"{base}__{q}{ext}"
    return ASSET_PREFIX + ("/" + host if host else "") + path


def rewrite(text, found):
    def sub(m):
        raw = m.group(0)
        url = normalize(raw)
        found.add(url)
        loc = local_path(url)
        return loc.replace("/", "\\/") if "\\/" in raw else loc
    return URL_RE.sub(sub, text)


def save_asset(url, data):
    dest = os.path.join(ROOT, "public", local_path(url).lstrip("/").replace("/", os.sep))
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, "wb") as f:
        f.write(data)


def route_file(loc):
    path = urllib.parse.urlsplit(loc).path.strip("/")
    return (path or "index") + ".html"


def main():
    sitemap = fetch(SITE + "/sitemap.xml").decode()
    routes = re.findall(r"<loc>([^<]+)</loc>", sitemap)
    print(f"{len(routes)} pages")

    found = set()
    with ThreadPoolExecutor(8) as ex:
        pages = list(ex.map(lambda u: (u, fetch(u, allow_error_status=True).decode("utf-8")), routes))
    for url, html in pages:
        for pat in STRIP_PATTERNS:
            html = pat.sub("", html)
        html = rewrite(html, found)
        dest = os.path.join(PAGES_DIR, route_file(url))
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, "w", encoding="utf-8", newline="") as f:
            f.write(html)

    # Download assets; .mjs chunks are scanned for further imports/URLs.
    done = set()
    failed = []
    queue = set(found)
    while queue:
        # Bare prefixes like ".../fontshare/" are only used in startsWith checks.
        batch = sorted(u for u in queue - done if not urllib.parse.urlsplit(u).path.endswith("/"))
        queue = set()
        done.update(batch)

        def grab(url):
            try:
                return url, fetch(url), None
            except Exception as e:  # noqa: BLE001
                return url, None, e

        with ThreadPoolExecutor(16) as ex:
            for url, data, err in ex.map(grab, batch):
                if err:
                    failed.append((url, err))
                    continue
                path = urllib.parse.urlsplit(url).path
                if path.endswith((".mjs", ".js", ".json", ".css")):
                    text = data.decode("utf-8")
                    for rel in IMPORT_RE.findall(text):
                        queue.add(urllib.parse.urljoin(url, rel))
                    for rel, base, to_cms in NEW_URL_RE.findall(text):
                        target = urllib.parse.urljoin(base, rel)
                        queue.add(target.replace("/modules/", "/cms/", 1) if to_cms else target)
                    new = set()
                    text = rewrite(text, new)
                    text = LOCAL_BASE_RE.sub(r"\1location.origin+\2", text)
                    text = EDITOR_BAR_RE.sub(r"EditorBar:void 0,__disabledEditorBar:\1", text)
                    queue.update(new)
                    data = text.encode("utf-8")
                save_asset(url, data)
        print(f"downloaded {len(done)} assets")

    for url, err in failed:
        print(f"FAILED {url}: {err}", file=sys.stderr)
    print(f"done: {len(pages)} pages, {len(done) - len(failed)} assets, {len(failed)} failures")


if __name__ == "__main__":
    main()
