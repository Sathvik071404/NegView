import { eligibleGames, storePage } from "../../lib/steam.js";

export async function onRequestGet({ request }) {
  const page = Number(new URL(request.url).searchParams.get("page") || 0);
  if (!Number.isSafeInteger(page) || page < 0 || page > 10000) return Response.json({ error: "Invalid games page." }, { status: 400 });
  try {
    const items = await storePage("", page * 25, 25), games = await eligibleGames(items);
    return Response.json({ games, hasMore: items.length === 25, page }, { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=900" } });
  } catch (error) {
    const status = error.status === 429 ? 429 : error.name === "TimeoutError" ? 504 : 502;
    return Response.json({ error: error.message || "Steam’s popular games are unavailable." }, { status });
  }
}
