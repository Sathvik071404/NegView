const noStore = { "Cache-Control": "no-store" };

// Defense-in-depth against aggregate-counter inflation. The Origin check below
// only stops cross-site browser requests; it cannot stop a non-browser client
// that sets a matching Origin header. This sliding-window throttle bounds how
// many increments one network (ASN) can issue per minute, while leaving the
// same-origin CSRF check intact. In production every request carries
// `request.cf.asn`; if it is ever absent we do not block.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;
const hits = new Map();

function throttleAllowed(asn) {
  if (!asn) return true;
  const now = Date.now();
  const recent = (hits.get(asn) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) { hits.set(asn, recent); return false; }
  recent.push(now);
  hits.set(asn, recent);
  return true;
}

export async function onRequestPost({ request, env }) {
  if (request.headers.get("Origin") !== new URL(request.url).origin) {
    return Response.json({ error: "Page-view count is unavailable." }, { status: 403, headers: noStore });
  }
  if (!throttleAllowed(request.cf?.asn)) {
    return Response.json({ error: "Page-view count is too frequent." }, { status: 429, headers: noStore });
  }
  try {
    const total = await env.VIEWS_DB.prepare("UPDATE site_views SET total = total + 1 WHERE id = 1 RETURNING total").first("total");
    if (!Number.isSafeInteger(total)) throw new Error("Counter row is missing.");
    return Response.json({ total }, { headers: noStore });
  } catch {
    return Response.json({ error: "Page-view count is unavailable." }, { status: 503, headers: noStore });
  }
}
