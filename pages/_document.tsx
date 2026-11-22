import { Head, Html, Main, NextScript, type DocumentProps } from "next/document";
import parse from "html-react-parser";
import type { MirroredPage } from "../lib/pages";

export default function Document(props: DocumentProps) {
  const page = props.__NEXT_DATA__.props?.pageProps?.page as MirroredPage | undefined;
  if (!page) {
    return (
      <Html>
        <Head />
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }

  return (
    <Html {...page.htmlAttrs}>
      <Head>{parse(page.head)}</Head>
      {/* Framer's SSR body, byte for byte. <Main /> is hidden: the page renders null. */}
      <body dangerouslySetInnerHTML={{ __html: page.body }} />
    </Html>
  );
}
