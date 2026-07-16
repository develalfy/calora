// app/try/page.tsx — server entry for /try.
//
// Why a server wrapper around a client component:
//   Next.js App Router only reads `export const metadata` from server
//   components. The form lives in `PageClient.tsx` (marked `"use client"`
//   because it owns form state and fires the AI estimate). Without this
//   wrapper, every page inherits the root layout's title — losing SEO.
//
// Pattern reference: Next.js docs, "client-component-with-server-metadata".

import PageClient from "./PageClient";

export default function TryPage() {
  return <PageClient />;
}
