// Framer's runtime reads CMS data with `file.framercms?range=0-192,385-991`,
// which Framer's CDN answers with just those bytes (inclusive) and HTTP 200.
// Static hosts ignore the query and send the whole file, so serve the slices
// here: fetch each file once, then cut and concatenate the requested ranges.
(function () {
  var realFetch = window.fetch.bind(window);
  var files = new Map();

  window.fetch = function (input, init) {
    var url;
    try {
      url = new URL(typeof input === "string" || input instanceof URL ? input : input.url, location.href);
    } catch (e) {
      return realFetch(input, init);
    }
    var range = url.searchParams.get("range");
    if (url.origin !== location.origin || !range || !url.pathname.endsWith(".framercms")) {
      return realFetch(input, init);
    }

    var path = url.pathname;
    if (!files.has(path)) {
      files.set(path, realFetch(path).then(function (r) {
        if (!r.ok) throw new Error("Request failed: " + r.status + " " + r.statusText);
        return r.arrayBuffer();
      }).catch(function (err) {
        files.delete(path);
        throw err;
      }));
    }

    return files.get(path).then(function (buf) {
      var whole = new Uint8Array(buf);
      var parts = range.split(",").map(function (s) {
        var ab = s.split("-");
        return whole.subarray(Number(ab[0]), Number(ab[1]) + 1);
      });
      var out = new Uint8Array(parts.reduce(function (n, p) { return n + p.length; }, 0));
      var at = 0;
      parts.forEach(function (p) { out.set(p, at); at += p.length; });
      return new Response(out, { status: 200, headers: { "Content-Type": "application/octet-stream" } });
    });
  };
})();
