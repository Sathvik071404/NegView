export async function onRequestGet({ request }) {
  const query = new URL(request.url).searchParams.get("q")?.trim();
  if (!query || query.length < 2 || query.length > 80 || /[\u0000-\u001f]/.test(query)) return Response.json({ error: "Enter a game title between 2 and 80 characters." }, { status: 400 });
  try {
    const response = await fetch(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(query)}&l=english&cc=US`, { headers: { "User-Agent": "NegView/1.0" }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) return Response.json({ error: "Steam search is temporarily unavailable." }, { status: response.status === 429 ? 429 : 502 });
    const data = await response.json(), games = (data.items || []).filter((game) => game.type === "app" && Number.isSafeInteger(game.id) && game.name).map((game) => ({ id: String(game.id), name: game.name, image: game.tiny_image }));
    return Response.json({ games }, { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=900" } });
  } catch (error) { return Response.json({ error: error.name === "TimeoutError" ? "Steam search timed out. Please retry." : "Steam search is temporarily unavailable." }, { status: error.name === "TimeoutError" ? 504 : 502 }); }
}
