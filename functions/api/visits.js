const noStore = { "Cache-Control": "no-store" };

export async function onRequestPost({ request, env }) {
  if (request.headers.get("Origin") !== new URL(request.url).origin) {
    return Response.json({ error: "Page-view count is unavailable." }, { status: 403, headers: noStore });
  }

  try {
    const total = await env.VIEWS_DB.prepare("UPDATE site_views SET total = total + 1 WHERE id = 1 RETURNING total").first("total");
    if (!Number.isSafeInteger(total)) throw new Error("Counter row is missing.");
    return Response.json({ total }, { headers: noStore });
  } catch {
    return Response.json({ error: "Page-view count is unavailable." }, { status: 503, headers: noStore });
  }
}
