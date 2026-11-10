const store = "https://store.steampowered.com";
const headers = { "User-Agent": "NegView/1.0" };

export async function onRequestGet() {
  const deadline = Date.now() + 25000;
  try {
    const catalog = await fetch(`${store}/search/?query=&start=0&count=1&l=english&cc=US`, {
      headers,
      cf: { cacheTtl: 3600, cacheEverything: true },
      signal: AbortSignal.timeout(Math.min(10000, Math.max(1, deadline - Date.now())))
    });
    if (!catalog.ok) return Response.json({ error: "Steam's game catalog is unavailable. Please retry." }, { status: 502 });
    const total = Number((await catalog.text()).match(/of\s+([\d,]+)/i)?.[1]?.replaceAll(",", ""));
    if (!Number.isSafeInteger(total) || total < 1) return Response.json({ error: "Steam's game catalog is unavailable. Please retry." }, { status: 502 });

    // shortcut: cap each lookup at 25s and eight candidates; raise after measuring hosted latency and eligibility.
    for (let attempt = 0; attempt < 8; attempt++) {
      const start = Math.floor(Math.random() * total);
      const results = await fetch(`${store}/search/results/?query=&start=${start}&count=1&json=1&l=english&cc=US`, {
        headers,
        signal: AbortSignal.timeout(Math.min(8000, Math.max(1, deadline - Date.now())))
      });
      if (!results.ok) return Response.json({ error: "Steam's game catalog is unavailable. Please retry." }, { status: results.status === 429 ? 429 : 502 });
      const item = (await results.json()).items?.[0];
      const appid = item?.logo?.match(/\/apps\/(\d+)\//)?.[1];
      if (!appid) continue;

      const response = await fetch(`${store}/api/appdetails?appids=${appid}&cc=US&l=english`, { signal: AbortSignal.timeout(Math.min(8000, Math.max(1, deadline - Date.now()))) });
      if (response.status === 429) return Response.json({ error: "Steam is rate-limiting requests. Wait a moment and retry." }, { status: 429 });
      if (!response.ok) return Response.json({ error: "Steam's game catalog is unavailable. Please retry." }, { status: 502 });
      const entry = (await response.json())[appid];
      if (!entry?.success || entry.data?.type !== "game") continue;

      const input = { appid: Number(appid), filter: 0, review_type: 2, purchase_type: 1, languages: ["english"], day_range: 0, cursor: "*", num_per_page: 1, filter_offtopic_activity: true };
      const reviews = await fetch(`https://api.steampowered.com/IUserReviewsService/GetAppReviews/v1/?input_json=${encodeURIComponent(JSON.stringify(input))}`, {
        cf: { cacheTtl: 600, cacheEverything: true },
        signal: AbortSignal.timeout(Math.min(8000, Math.max(1, deadline - Date.now())))
      });
      if (reviews.status === 429) return Response.json({ error: "Steam is rate-limiting requests. Wait a moment and retry." }, { status: 429 });
      if (!reviews.ok) continue;
      const page = await reviews.json(), comments = (page.response || page).reviews || [];
      if (comments.some((review) => review.language === "english" && review.voted_up === false && review.review?.trim())) {
        return Response.json({ id: appid, name: entry.data.name, image: item.logo, poster: entry.data.background_raw || entry.data.screenshots?.[0]?.path_full || entry.data.header_image }, { headers: { "Cache-Control": "no-store" } });
      }
    }
    return Response.json({ error: "Couldn't find a game with an English negative review this time. Please try again." }, { status: 503 });
  } catch (error) {
    return Response.json({ error: error.name === "TimeoutError" ? "Steam's game catalog took too long to respond. Please retry." : "Steam's game catalog is unavailable. Please retry." }, { status: error.name === "TimeoutError" ? 504 : 502 });
  }
}
