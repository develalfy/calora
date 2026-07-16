// app/b2b/page.tsx — server entry for /b2b.
// See app/try/page.tsx for the "server wrapper → client form" rationale.

import PageClient from "./PageClient";

export default function B2BPage() {
  return <PageClient />;
}
