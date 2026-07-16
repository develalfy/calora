// app/pricing/page.tsx — server entry for /pricing.
// See app/try/page.tsx for the "server wrapper → client form" rationale.

import PageClient from "./PageClient";

export default function PricingPage() {
  return <PageClient />;
}
