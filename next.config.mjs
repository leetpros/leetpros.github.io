/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emit a fully static site to out/ (GitHub Pages, Cloud Run + nginx, any CDN).
  output: "export",
  // /about -> out/about.html, matching the original URLs (no trailing slash).
  trailingSlash: false,
  images: { unoptimized: true },
  // The pages are pre-rendered Framer markup; React strict mode adds nothing.
  reactStrictMode: false,
  poweredByHeader: false,
  // Avoid picking up a stray lockfile in a parent directory.
  outputFileTracingRoot: import.meta.dirname,
};

export default nextConfig;
