// Health check endpoint — useful for deployment probes.
export const runtime = "nodejs";

export async function GET() {
  return Response.json({
    ok: true,
    service: "calora",
    version: "0.1.0",
    timestamp: new Date().toISOString(),
  });
}