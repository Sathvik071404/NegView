import { eligibleGames, storePage } from "../../lib/steam.js";

export async function onRequestGet({ request }) {
  const params = new URL(request.url).searchParams, query = params.get("q")?.trim(), page = Number(params.get("page") || 0);
  if (!query || query.length < 2 || query.length > 80 || /[\u0000-\u001f]/.test(query)) return Response.json({ error: "Enter a game title between 2 and 80 characters." }, { status: 400 });
  if (!Number.isSafeInteger(page) || page < 0 || page > 10000) return Response.json({ error: "Invalid search page." }, { status: 400 });
  try {
    const items = await storePage(query, page * 25, 25), games = await eligibleGames(items);
    return Response.json({ games, hasMore: items.length === 25, page }, { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=900" } });
  } catch (error) {
    const status = error.status === 429 ? 429 : error.name === "TimeoutError" ? 504 : 502;
    return Response.json({ error: error.message || "Steam search is temporarily unavailable." }, { status });
  }
}
