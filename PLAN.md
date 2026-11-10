# NegView — Product Plan

## Product

A fun, noncommercial college website for browsing negative Steam reviews. Visitors can search without signing in. The site is for entertainment and a class project, not a commercial product.

## V1 goals

- Let anyone search for a Steam game by name.
- Show reviews Steam marks as negative.
- Make it easy to read and browse reviews, with links back to Steam.
- Feature Steam’s current popular games in 15-game home pages.
- Let visitors move between home, search results, and game reviews without losing their place.
- Keep the project free or nearly free and store no visitor-level data.

## In scope

- A home page with a search box and Steam’s popular games, paged in groups of 15.
- A desktop-first 5-by-3 grid of 15 popular Steam games per page, with live title suggestions and paged search results.
- A random game action that only returns a game with at least one written English negative review.
- A floating header that reappears when scrolling up, with search, random game, and theme controls on every app view.
- Same-tab game detail views with in-memory review and search results caching for browser back/forward navigation.
- Search for a game by title. If multiple titles match, let the visitor choose the intended one.
- English-language negative Steam reviews, ordered by most helpful.
- Review cards with review text, date, Steam author attribution, and a link to Steam.
- A “Load more” control for fetching additional review pages.
- Steam’s existing off-topic filtering and removal of obvious duplicate review cards.
- Clear states for no matches, no reviews, loading, Steam/API errors, and rate limits.
- No login, user accounts, user submissions, or stored Steam review data. A single aggregate page-view total is stored in Cloudflare D1; it has no visitor IDs or cookies.

## Out of scope for V1

- Adult-content switch. Steam’s review response does not provide a per-review adult-content flag, so the switch is omitted rather than approximated with a text heuristic.
- Visitor reports, user-generated content, or moderation queue.
- Language, date, playtime, or other review filters.
- Monetization, billing, visitor profiles, and behavioral analytics.
- Automatically ranking every Steam game.

## Main user journeys

### Home

1. Visitor sees the search bar and fixed 15-game grid.
2. Visitor can choose one of the featured games or search for another title.

### Search and choose a game

1. Visitor enters a game name and sees live suggestions.
2. Submitting the search opens an in-site results view with Steam Store matches.
3. Visitor chooses a title to open its game page in the same browser tab.

### Browse reviews

1. The game page shows the title, poster, and English reviews Steam marks negative, sorted by helpfulness.
2. Each card shows the review text, date, author attribution, and Steam link.
3. Visitor selects “Load more” to fetch the next page.

## Homepage selection

- Read Steam’s current popular Store results in pages of 15.
- Show only games with at least one written English negative review.
- The Store order is Steam’s current ranking and can change between cache refreshes.

## Data

### Steam game

- Steam app ID — stable identifier used to request reviews.
- Display name — shown in search results and page headings.
- Homepage-list inclusion/order — supplied by Steam’s current popular list, then filtered for eligible reviews.
- English negative review availability — used to decide which Store results can appear.

### Steam review

Use Steam’s response fields as needed for the UI:

- Recommendation ID
- Author SteamID
- Review text
- Language
- Creation/update timestamps
- Positive/negative vote (`voted_up`)
- Helpful vote count and helpfulness score
- Steam review metadata needed for the source link

Do not persist Steam reviews in an application database. Cache responses briefly at the server edge. Steam says anonymous review API responses may be cached for up to 10 minutes.

### Page-view counter

- Count every page load, including refreshes and repeat visits; the total is not unique visitors.
- Store only one aggregate integer in Cloudflare D1. Do not add cookies, browser IDs, IP addresses, or visit histories.
- Cloudflare may process technical connection metadata under its own privacy practices; see the privacy page.

## Architecture and hosting

- **Frontend:** simplest suitable static HTML, CSS, and JavaScript site; no framework has been selected.
- **Hosting:** Cloudflare Pages connected to the GitHub repository, so pushes can deploy the site.
- **Preview:** GitHub Pages serves a static showcase from `docs/` and embeds the live Cloudflare app; Functions remain on Cloudflare Pages.
- **Backend:** Cloudflare Pages Functions for the small server-side Steam API proxy and short-lived cache. This keeps the frontend and backend in one deployment and avoids a separate cross-origin setup.
- **Database:** one Cloudflare D1 row stores the aggregate page-view total. Steam reviews, searches, and visitor-level data are not persisted.
- **Authentication:** none.
- **Secrets:** the documented review endpoint can be called without a key. Do not expose any API key if a later integration requires one.
- **Free-tier expectation:** suitable for a light-traffic class project; Cloudflare currently documents a 100,000/day free Workers request quota for Functions. Recheck limits at deployment.

## Steam integration

- Use Steam’s current `IUserReviewsService/GetAppReviews` for review pages. Request English language, negative review type, and helpful sorting, and use its cursor for pagination.
- Keep Steam’s default off-topic activity filtering enabled.
- The API’s Helpful filter has a day-range behavior; select and document the appropriate range during implementation so the meaning of “most helpful” is clear.
- Steam’s response provides an author SteamID, not a display name. Initial attribution can link to the author’s Steam profile. Verify the best supported URL for an individual review; otherwise link to the game’s Steam reviews page.
- **Game search uses Steam’s public Store route:** The `search/results/?term=...` route supports Steam-style paging, but it is not documented in the official API docs and may change.
- Steam can rate-limit unauthenticated review requests; handle HTTP 429 and show a retry path.

## State and caching

- Search text and the selected app are client-side state.
- Review pages are fetched on demand; “Load more” uses Steam’s cursor.
- Cache review API responses for no longer than Steam’s documented 10-minute allowance.
- No offline mode or persistent user preferences are required for V1.

## Privacy, security, and abuse

- No accounts, visitor identifiers, or personal data are requested by NegView.
- The aggregate counter can be inflated by automated or repeated requests; it is a lightweight page-view count, not a trusted analytics metric.
- Treat review text as untrusted content; render it as text, not executable HTML.
- Validate app IDs, cursors, and search input at the API boundary.
- Keep the server endpoint limited to the Steam operations the site needs; do not create a general-purpose proxy.
- Review Steam API terms and attribution/branding requirements before public deployment.

## Quality bar

- Search, game selection, review pagination, and Steam links work on desktop.
- Loading, empty, API error, and rate-limit states are understandable.
- Review text is safely rendered and long reviews remain readable.
- Manually check the live site and a few known game searches before calling V1 complete.
- Desktop is the primary V1 layout; smaller-device optimization is deferred to a later version.

## Assumptions

- Plain HTML/CSS/JavaScript is preferred for the smallest implementation; no stack was explicitly chosen.
- Steam supplies the changing home-page order; NegView filters out games without written English negative reviews.
- The site is intended for a public GitHub-linked deployment with light classmate traffic.
- A small serverless function is acceptable; GitHub remains the source repository, while Cloudflare hosts the app.
- “Small page at a time” means using Steam’s default 20 reviews per response unless implementation experience suggests another size.
- Author attribution can initially use a profile link because Steam’s review response provides a SteamID rather than a display name.

## Open risks and decisions

1. **Game-name search:** the current Steam Store route is public and works for paging, but it is undocumented and may change.
2. **Steam terms and branding:** confirm current Steam API Terms of Use and required Steam links/branding before publishing.
3. **Review link format:** verify whether an individual review URL can be reliably constructed from returned IDs; otherwise link to the game’s Steam reviews page and author profile.
4. **Homepage threshold:** decide whether to require a minimum number of reviews before a game can be featured, to avoid tiny-sample titles dominating the lowest-percentage list.
5. **Helpful ordering range:** Steam’s helpful sort uses a day range; select the intended range and communicate that sorting behavior accurately.
6. **Free-tier drift:** hosting quotas and terms may change; recheck Cloudflare’s current limits before deployment.
7. **Content moderation:** Steam filters off-topic review activity, but the site does not add human moderation; displayed text is user-generated content.
