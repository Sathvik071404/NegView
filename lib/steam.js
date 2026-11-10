const store = "https://store.steampowered.com";
const reviewsApi = "https://api.steampowered.com/IUserReviewsService/GetAppReviews/v1/";
const headers = { "User-Agent": "NegView/1.0" };

export async function storePage(query, start, count) {
  const url = new URL(`${store}/search/results/`);
  url.search = new URLSearchParams({ term: query, start: String(start), count: String(count), json: "1", l: "english", cc: "US" });
  const response = await fetch(url, { headers, cf: { cacheTtl: 300, cacheEverything: true }, signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw Object.assign(new Error("Steam search is temporarily unavailable."), { status: response.status });
  return (await response.json()).items || [];
}

export async function eligibleGames(items) {
  const candidates = items.map((item) => ({ item, id: item.logo?.match(/\/apps\/(\d+)\//)?.[1] })).filter((game) => game.id);
  const reviews = await Promise.all(candidates.map(async ({ id }) => {
    const input = { appid: Number(id), filter: 0, review_type: 2, purchase_type: 1, languages: ["english"], day_range: 0, cursor: "*", num_per_page: 1, filter_offtopic_activity: true };
    try {
      const response = await fetch(`${reviewsApi}?input_json=${encodeURIComponent(JSON.stringify(input))}`, { cf: { cacheTtl: 600, cacheEverything: true }, signal: AbortSignal.timeout(8000) });
      if (response.status === 429) throw Object.assign(new Error("Steam is rate-limiting requests. Wait a moment and retry."), { status: 429 });
      if (!response.ok) return false;
      const data = await response.json(), comments = (data.response || data).reviews || [];
      return comments.some((review) => review.language === "english" && review.voted_up === false && review.review?.trim());
    } catch (error) { if (error.status === 429) throw error; return false; }
  }));
  const reviewed = candidates.filter((_, index) => reviews[index]);
  return (await Promise.all(reviewed.map(async ({ item, id }) => {
    try {
      const response = await fetch(`${store}/api/appdetails?appids=${id}&cc=US&l=english`, { cf: { cacheTtl: 3600, cacheEverything: true }, signal: AbortSignal.timeout(8000) });
      if (response.status === 429) throw Object.assign(new Error("Steam is rate-limiting requests. Wait a moment and retry."), { status: 429 });
      if (!response.ok) return null;
      const entry = (await response.json())[id];
      return entry?.success && entry.data?.type === "game" ? { id, name: entry.data.name, image: item.logo, poster: entry.data.background_raw || entry.data.screenshots?.[0]?.path_full || entry.data.header_image } : null;
    } catch (error) { if (error.status === 429) throw error; return null; }
  }))).filter(Boolean);
}
