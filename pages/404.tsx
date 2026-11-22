import type { GetStaticProps } from "next";
import { loadPage, type MirroredPage } from "../lib/pages";

export const config = { unstable_runtimeJS: false };

export const getStaticProps: GetStaticProps<{ page: MirroredPage }> = async () => ({
  props: { page: loadPage(["404"]) },
});

export default function NotFound() {
  return null;
}
