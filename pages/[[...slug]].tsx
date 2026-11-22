import type { GetStaticPaths, GetStaticProps } from "next";
import { listRoutes, loadPage, type MirroredPage } from "../lib/pages";

// The markup is rendered whole by _document. Framer's own runtime hydrates it,
// so Next.js ships no client JS (otherwise two React apps fight over the DOM).
export const config = { unstable_runtimeJS: false };

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: listRoutes().map((slug) => ({ params: { slug } })),
  fallback: false,
});

export const getStaticProps: GetStaticProps<{ page: MirroredPage }> = async ({ params }) => ({
  props: { page: loadPage((params?.slug as string[] | undefined) ?? []) },
});

export default function Page() {
  return null;
}
