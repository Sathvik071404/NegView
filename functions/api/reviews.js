export async function onRequestGet({ request }) {
  const params = new URL(request.url).searchParams, appid = params.get("appid"), cursor = params.get("cursor") || "*";
  if (!/^\d{1,10}$/.test(appid || "") || Number(appid) < 1 || cursor.length > 2048 || /[\u0000-\u001f]/.test(cursor)) return Response.json({ error: "Invalid game or page cursor." }, { status: 400 });
  const input = { appid: Number(appid), filter: 0, review_type: 2, purchase_type: 1, languages: ["english"], day_range: 0, cursor, num_per_page: 20, filter_offtopic_activity: true };
  try {
    const url = `https://api.steampowered.com/IUserReviewsService/GetAppReviews/v1/?input_json=${encodeURIComponent(JSON.stringify(input))}`;
    const response = await fetch(url, { cf: { cacheTtl: 600, cacheEverything: true }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) return Response.json({ error: response.status === 429 ? "Steam is rate-limiting requests. Wait a moment and retry." : "Steam could not load reviews right now." }, { status: response.status === 429 ? 429 : 502 });
    return Response.json(await response.json(), { headers: { "Cache-Control": "public, max-age=600" } });
  } catch (error) { return Response.json({ error: error.name === "TimeoutError" ? "Steam review request timed out. Please retry." : "Steam could not load reviews right now." }, { status: error.name === "TimeoutError" ? 504 : 502 }); }
}
