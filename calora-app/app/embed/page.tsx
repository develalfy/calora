// app/embed/page.tsx — server entry for /embed.
// See app/try/page.tsx for the "server wrapper → client form" rationale.

import PageClient from "./PageClient";

export default function EmbedPage() {
  return <PageClient />;
}
