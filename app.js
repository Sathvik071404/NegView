const $ = (selector) => document.querySelector(selector);
const home = $("#home-view"), searchView = $("#search-view"), gameView = $("#game-view");
const searchResults = $("#search-results"), reviewList = $("#review-list"), header = $("#site-header");
const reviewCache = new Map(), searchCache = new Map(), loadingGames = new Set(), searchLoading = new Set(), homeSeen = new Set(), homeQueue = [];
let activeRoute = { view: "home" }, selected = null, homePage = 0, homeSteamPage = 0, homeHasMore = true, homeLoading = false, homeLoaded = false;
let suggestionGeneration = 0;
if (location.protocol === "file:") $("#file-notice").hidden = false;

function routeUrl(route) {
  if (route.view === "search") return `#search?q=${encodeURIComponent(route.query)}`;
  if (route.view === "game") {
    const query = new URLSearchParams({ id: route.game.id, name: route.game.name, image: route.game.image || "" });
    return `#game?${query}`;
  }
  return `${location.pathname}${location.search}#home`;
}

function routeFromLocation() {
  if (location.hash.startsWith("#search?")) return { view: "search", query: new URLSearchParams(location.hash.slice(8)).get("q") || "" };
  if (location.hash.startsWith("#game?")) {
    const params = new URLSearchParams(location.hash.slice(6)), id = params.get("id");
    if (/^\d{1,10}$/.test(id || "")) return { view: "game", game: { id, name: params.get("name") || `Steam game ${id}`, image: params.get("image") || "" } };
  }
  return { view: "home" };
}

function navigate(route) {
  suggestionGeneration++; closeSuggestions();
  history.replaceState({ ...activeRoute, scrollY: window.scrollY }, "");
  history.pushState({ ...route, scrollY: 0 }, "", routeUrl(route));
  renderRoute(route, 0);
}

function renderRoute(route, restoreScroll = 0) {
  activeRoute = route;
  home.hidden = route.view !== "home";
  searchView.hidden = route.view !== "search";
  gameView.hidden = route.view !== "game";
  if (route.view === "search") loadSearch(route.query);
  if (route.view === "game") showGame(route.game);
  if (route.view === "home" && !homeLoaded) loadPopularPage(0, false);
  requestAnimationFrame(() => window.scrollTo({ top: restoreScroll, behavior: "instant" }));
}

async function fetchGames(query, page = 0, signal) {
  const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&page=${page}`, { signal });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Steam search is unavailable.");
  return data;
}

async function fetchSuggestions(query, signal) {
  const response = await fetch(`/api/suggest?q=${encodeURIComponent(query)}`, { signal });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Steam search is unavailable.");
  return data.games || [];
}

async function loadPopularPage(page, append) {
  if (homeLoading || (page > 0 && !homeHasMore && !homeQueue.length)) return;
  homeLoading = true; $("#home-next").disabled = true;
  if (!append) { $("#home-games").replaceChildren(status("Loading Steam’s popular games…")); $("#home-next").hidden = true; homeQueue.length = 0; homeSeen.clear(); homeSteamPage = 0; homePage = 0; homeHasMore = true; }
  try {
    let attempts = 0;
    // shortcut: scan at most 100 Store candidates per visible page, raise after measuring Steam latency.
    while (homeQueue.length < 15 && homeHasMore && attempts++ < 4) {
      const response = await fetch(`/api/popular-games?page=${homeSteamPage}`), data = await response.json();
      if (!response.ok) throw new Error(data.error || "Steam’s popular games are unavailable.");
      const known = new Set([...homeSeen, ...homeQueue.map((game) => game.id)]);
      for (const game of data.games || []) if (!known.has(game.id)) { known.add(game.id); homeQueue.push(game); }
      homeSteamPage++; homeHasMore = Boolean(data.hasMore);
    }
    if (!append) $("#home-games").replaceChildren();
    for (const game of homeQueue.splice(0, 15)) {
      if (!homeSeen.has(game.id)) { homeSeen.add(game.id); $("#home-games").append(gameCard(game, homeSeen.size)); }
    }
    if (!homeSeen.size) $("#home-games").append(status("No popular games with written English negative reviews were found in these pages."));
    homePage++; homeLoaded = true;
    $("#home-page-note").textContent = `${homeSeen.size} popular games · Page ${homePage}`;
    $("#home-next").textContent = "NEXT 15 GAMES"; $("#home-next").hidden = !homeQueue.length && !homeHasMore;
  } catch (error) {
    if (!append) $("#home-games").replaceChildren();
    $("#home-page-note").textContent = error.message;
    $("#home-next").textContent = "RETRY"; $("#home-next").hidden = false;
  } finally { homeLoading = false; $("#home-next").disabled = false; }
}

function gameCard(game, number) {
  const card = document.createElement("button"); card.className = "game-card"; card.type = "button";
  card.style.setProperty("--card-delay", `${((number - 1) % 15) * 22}ms`);
  const image = document.createElement("img"); image.className = "game-art"; image.alt = `${game.name} poster`; image.loading = "lazy"; image.decoding = "async"; image.fetchPriority = "low";
  const info = document.createElement("span"); info.className = "game-info";
  const index = document.createElement("span"); index.className = "game-number"; index.textContent = `${String(number).padStart(2, "0")} / STEAM`;
  const title = document.createElement("span"); title.className = "game-card-title"; title.textContent = game.name;
  info.append(index, title); card.append(image, info); setPoster(image, game);
  card.addEventListener("click", () => navigate({ view: "game", game }));
  return card;
}

function attachSearch(form, input, suggestions) {
  let timer, controller;
  input.addEventListener("input", () => {
    const query = input.value.trim(), current = ++suggestionGeneration;
    for (const other of [$("#header-search"), $("#home-search")]) if (other !== input) other.value = input.value;
    clearTimeout(timer); controller?.abort();
    if (query.length < 2) { suggestions.hidden = true; return; }
    timer = setTimeout(async () => {
      controller = new AbortController();
      try {
        const result = await fetchSuggestions(query, controller.signal);
        if (current !== suggestionGeneration) return;
        renderSuggestions(suggestions, result.slice(0, 5));
      } catch (error) {
        if (error.name !== "AbortError" && current === suggestionGeneration) suggestions.hidden = true;
      }
    }, 240);
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault(); suggestionGeneration++; clearTimeout(timer); controller?.abort(); closeSuggestions();
    const query = input.value.trim();
    if (query.length >= 2) navigate({ view: "search", query });
  });
  input.addEventListener("keydown", (event) => { if (event.key === "Escape") { suggestionGeneration++; clearTimeout(timer); controller?.abort(); suggestions.hidden = true; } });
}

function closeSuggestions() { document.querySelectorAll(".search-suggestions").forEach((element) => { element.hidden = true; }); }

function renderSuggestions(root, result) {
  root.replaceChildren();
  for (const game of result) {
    const option = document.createElement("button"); option.type = "button"; option.className = "suggestion-option"; option.setAttribute("role", "option");
    if (game.image) { const image = document.createElement("img"); image.src = game.image; image.alt = ""; option.append(image); }
    const name = document.createElement("span"); name.textContent = game.name; option.append(name);
    option.addEventListener("click", () => { root.hidden = true; navigate({ view: "game", game }); });
    root.append(option);
  }
  if (!result.length) { const empty = document.createElement("p"); empty.className = "suggestion-empty"; empty.textContent = "No close matches yet. Press Search to see Steam results."; root.append(empty); }
  root.hidden = false;
}

attachSearch($("#header-search-form"), $("#header-search"), $("#header-suggestions"));
attachSearch($("#home-search-form"), $("#home-search"), $("#home-suggestions"));
$(".brand").addEventListener("click", (event) => { event.preventDefault(); navigate({ view: "home" }); });

async function loadSearch(query) {
  const normalized = query.trim();
  $("#search-title").textContent = normalized ? `Matches for “${normalized}”` : "Find a game.";
  $("#search-context").textContent = "Steam Store games with written English negative reviews · Scroll for more";
  const key = normalized.toLowerCase(), cached = searchCache.get(key);
  if (cached?.nextPage) { renderSearchResults(cached); return; }
  loadSearchPage(normalized);
}

async function loadSearchPage(query) {
  const key = query.toLowerCase(), state = searchCache.get(key) || { games: [], queue: [], nextPage: 0, hasMore: true };
  if (searchLoading.has(key) || (!state.hasMore && !state.queue.length)) return;
  searchLoading.add(key); searchResults.setAttribute("aria-busy", "true"); $("#search-next").disabled = true;
  if (!state.nextPage) searchResults.replaceChildren(status("Finding Steam games with English negative reviews…"));
  try {
    let attempts = 0;
    // shortcut: scan at most 100 Store candidates per visible page, raise after measuring Steam latency.
    while (state.queue.length < 15 && state.hasMore && attempts++ < 4) {
      const data = await fetchGames(query, state.nextPage);
      const known = new Set([...state.games, ...state.queue].map((game) => game.id));
      for (const game of data.games || []) if (!known.has(game.id)) { known.add(game.id); state.queue.push(game); }
      state.hasMore = Boolean(data.hasMore); state.nextPage++;
    }
    state.games.push(...state.queue.splice(0, 15));
    searchCache.set(key, state);
    if (activeRoute.view === "search" && activeRoute.query === query) renderSearchResults(state);
  } catch (error) {
    if (activeRoute.view === "search" && activeRoute.query === query) {
      $("#search-page-note").textContent = error.message;
      $("#search-next").textContent = "RETRY"; $("#search-next").hidden = false;
    }
  } finally { searchLoading.delete(key); searchResults.setAttribute("aria-busy", "false"); $("#search-next").disabled = false; }
}

function renderSearchResults(state) {
  searchResults.replaceChildren();
  if (!state.games.length) searchResults.append(status(state.hasMore ? "No eligible matches in this part of Steam’s list. Continue for more." : "No matching games with English negative reviews were found."));
  state.games.forEach((game, index) => searchResults.append(gameCard(game, index + 1)));
  $("#search-page-note").textContent = `${state.games.length} eligible games found`;
  $("#search-next").textContent = "LOAD MORE MATCHES";
  $("#search-next").hidden = !state.queue.length && !state.hasMore;
}

function showGame(game) {
  selected = game; $("#review-title").textContent = game.name;
  $("#store-link").href = `https://store.steampowered.com/app/${game.id}/`;
  const poster = $("#game-poster"); poster.alt = `${game.name} poster`; setPoster(poster, game);
  const cached = reviewCache.get(game.id);
  if (cached) renderReviewCache(game, cached);
  else { reviewList.replaceChildren(status("Loading English negative reviews…")); $("#more-wrap").hidden = true; loadReviews(game, false); }
}

async function loadReviews(game, append) {
  if (location.protocol === "file:") { $("#file-notice").hidden = false; return; }
  if (loadingGames.has(game.id)) return;
  const previous = reviewCache.get(game.id) || { reviews: [], cursor: "*" };
  if (append && !previous.cursor) return;
  loadingGames.add(game.id); $("#load-more").disabled = true;
  try {
    const cursor = append ? previous.cursor : "*";
    const response = await fetch(`/api/reviews?appid=${game.id}&cursor=${encodeURIComponent(cursor)}`, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) { const body = await response.json().catch(() => ({})); const error = new Error(body.error || "Steam could not load reviews."); error.status = response.status; throw error; }
    const body = await response.json(), data = body.response || body;
    const reviews = [...(append ? previous.reviews : [])], ids = new Set(reviews.map((review) => review.recommendationid));
    for (const review of data.reviews || []) if (!ids.has(review.recommendationid)) { ids.add(review.recommendationid); reviews.push(review); }
    const cache = { reviews, cursor: data.cursor || "", dayRange: data.day_range_used };
    reviewCache.set(game.id, cache);
    if (selected?.id === game.id) renderReviewCache(game, cache);
  } catch (error) {
    if (selected?.id === game.id) {
      const message = error.status === 429 ? "Steam is rate-limiting requests. Wait a moment and retry." : error.name === "TimeoutError" ? "Steam took too long to respond. Please retry." : error.message;
      if (!append) reviewList.replaceChildren();
      const row = status(message, true), retry = document.createElement("button");
      retry.className = "inline-retry"; retry.type = "button"; retry.textContent = "RETRY";
      retry.addEventListener("click", () => loadReviews(game, append)); row.append(" ", retry); reviewList.append(row);
    }
  } finally { loadingGames.delete(game.id); if (selected?.id === game.id) $("#load-more").disabled = false; }
}

function renderReviewCache(game, cache) {
  reviewList.replaceChildren(...cache.reviews.map((review) => reviewCard(review, game.id)));
  if (!cache.reviews.length) reviewList.append(status("No English negative reviews found for this game."));
  $("#review-context").textContent = `Most helpful · ${cache.dayRange ? `Past ${cache.dayRange} days` : "All time"}`;
  $("#more-wrap").hidden = !cache.cursor || !cache.reviews.length;
}

function reviewCard(review, appid) {
  const card = document.createElement("article"); card.className = "review-card"; card.dataset.id = review.recommendationid;
  const text = document.createElement("div"); text.className = "review-text"; renderReviewText(text, review.review || "(No written review.)");
  const date = document.createElement("span"); date.textContent = new Date(review.timestamp_created * 1000).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  const author = document.createElement("a"); author.textContent = "STEAM AUTHOR ↗"; author.href = `https://steamcommunity.com/profiles/${encodeURIComponent(review.author.steamid)}`; author.target = "_blank"; author.rel = "noopener noreferrer";
  const steam = document.createElement("a"); steam.textContent = "VIEW REVIEW ↗"; steam.href = `https://steamcommunity.com/profiles/${encodeURIComponent(review.author.steamid)}/recommended/${appid}/`; steam.target = "_blank"; steam.rel = "noopener noreferrer";
  const meta = document.createElement("div"); meta.className = "review-meta"; meta.innerHTML = `<span class="negative-mark">● NOT RECOMMENDED</span>`; meta.append(date, author, steam); card.append(text, meta); return card;
}

function renderReviewText(container, source) {
  const markup = /\[(\/?)((?:h[1-6])|b|i|u|strike|spoiler|list|quote|hr|url|\*)(?:=([^\]]+))?\]/gi;
  const elements = { h1: "h3", h2: "h4", h3: "h5", h4: "h5", h5: "h5", h6: "h5", b: "strong", i: "em", u: "u", strike: "s", spoiler: "span", list: "ul", quote: "blockquote" };
  const fragment = document.createDocumentFragment(), stack = [{ name: "", node: fragment }];
  let offset = 0;
  for (const match of source.matchAll(markup)) {
    stack.at(-1).node.append(document.createTextNode(source.slice(offset, match.index)));
    const closing = Boolean(match[1]), name = match[2].toLowerCase();
    if (name === "hr" && !closing) stack.at(-1).node.append(document.createElement("hr"));
    else if (name === "*" && !closing && stack.some((entry) => entry.name === "list")) {
      const listIndex = stack.findLastIndex((entry) => entry.name === "list"); stack.length = listIndex + 1;
      const item = document.createElement("li"); stack.at(-1).node.append(item); stack.push({ name, node: item });
    } else if (closing) {
      const index = stack.findLastIndex((entry) => entry.name === name); if (index > 0) stack.length = index;
    } else if (name === "url" && match[3]) {
      let href; try { const url = new URL(match[3]); if (url.protocol === "https:") href = url.href; } catch {}
      if (href) { const link = document.createElement("a"); link.href = href; link.target = "_blank"; link.rel = "noopener noreferrer"; stack.at(-1).node.append(link); stack.push({ name, node: link }); }
    } else if (elements[name]) {
      const element = document.createElement(elements[name]); if (name === "spoiler") element.className = "review-spoiler";
      stack.at(-1).node.append(element); stack.push({ name, node: element });
    }
    offset = match.index + match[0].length;
  }
  stack.at(-1).node.append(document.createTextNode(source.slice(offset))); container.replaceChildren(fragment);
}

function status(message, isError = false) { const row = document.createElement("p"); row.className = `status${isError ? " error" : ""}`; row.textContent = message; return row; }
function setPoster(image, game) {
  const posterUrl = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${game.id}/library_600x900.jpg`;
  image.onerror = () => {
    const fallback = game.poster || game.image;
    if (fallback && image.src !== fallback) image.src = fallback; else image.remove();
  };
  image.src = posterUrl;
}

$("#load-more").addEventListener("click", () => selected && loadReviews(selected, true));
$("#home-next").addEventListener("click", () => loadPopularPage(homePage, homeLoaded));
$("#search-next").addEventListener("click", () => activeRoute.view === "search" && loadSearchPage(activeRoute.query));
if ("IntersectionObserver" in window) {
  const pageObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) if (entry.isIntersecting) {
      if (entry.target.id === "search-more" && activeRoute.view === "search") loadSearchPage(activeRoute.query);
    }
  }, { rootMargin: "360px 0px" });
  pageObserver.observe($("#search-more"));
}
$("#random-game").addEventListener("click", async (event) => {
  const button = event.currentTarget;
  if (button.disabled) return;
  button.disabled = true; button.classList.add("is-randomizing"); button.innerHTML = `FINDING… <span aria-hidden="true">⤨</span>`;
  $("#action-status").hidden = true;
  try {
    const response = await fetch("/api/random-game", { signal: AbortSignal.timeout(30000) }), game = await response.json();
    if (!response.ok) throw new Error(game.error || "Steam could not find an eligible game. Try again.");
    navigate({ view: "game", game });
  } catch (error) {
    $("#action-status").textContent = error.name === "TimeoutError" ? "Steam is taking too long to find a game. Please try again." : error.message;
    $("#action-status").hidden = false;
  } finally {
    button.disabled = false; button.classList.remove("is-randomizing"); button.innerHTML = `RANDOM GAME <span aria-hidden="true">⤨</span>`;
  }
});

$("#back-to-top").addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
let previousY = window.scrollY;
function updateScrollControls() {
  const currentY = window.scrollY;
  const backToTop = $("#back-to-top");
  if (currentY < 40) {
    header.classList.add("header-at-top"); header.classList.remove("header-floating", "header-hidden"); backToTop.hidden = true;
  } else {
    header.classList.remove("header-at-top");
    if (currentY < previousY - 2) {
      header.classList.add("header-floating"); header.classList.remove("header-hidden"); backToTop.hidden = currentY < 480;
    } else if (currentY > previousY + 2) {
      header.classList.add("header-floating", "header-hidden"); backToTop.hidden = true;
    }
  }
  previousY = currentY;
}
header.classList.add("header-at-top");
window.addEventListener("scroll", updateScrollControls, { passive: true });

history.scrollRestoration = "manual";
const initialRoute = routeFromLocation();
activeRoute = initialRoute;
history.replaceState({ ...initialRoute, scrollY: 0 }, "", location.href);
renderRoute(initialRoute, 0);
window.addEventListener("popstate", (event) => {
  const route = event.state?.view ? event.state : routeFromLocation();
  renderRoute(route, event.state?.scrollY || 0);
});
updateScrollControls();
