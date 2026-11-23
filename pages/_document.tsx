import { Head, Html, Main, NextScript, type DocumentProps } from "next/document";
import parse from "html-react-parser";
import type { MirroredPage } from "../lib/pages";

const MAIN_MARKER = "<next-js-internal-body-render-target></next-js-internal-body-render-target>";

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
      {/* The page body, byte for byte. The trailing tag is the marker <Main /> would
          emit; Next.js splits the document on it, and without it the export ends
          in a stray "undefined" after </html>. */}
      <body dangerouslySetInnerHTML={{ __html: page.body + MAIN_MARKER }} />
    </Html>
  );
}
