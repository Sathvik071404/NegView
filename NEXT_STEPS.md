# NegView: recommendations and next steps

## Completed in this pass

- Home now loads another group of 15 only after **Next 15 Games** is clicked.
- Search keeps its existing scroll-to-load behavior.
- Game art uses Steam's standard 600 × 900 library poster, loads lazily, and decodes off the main thread.
- Search, suggestions, and popular-list responses can be reused for five minutes, with stale results allowed while the cache refreshes.
- The logo now reads as a review chat bubble with a negative mark. Page changes and newly added cards use short, reduced-motion-aware animations.
- The footer counts every page load, including refreshes, as an aggregate total in Cloudflare D1 without cookies or visitor identifiers.
- The D1 schema is applied in Cloudflare and local Wrangler; the local counter was checked for one-step increments and cross-origin rejection.
- The updated Cloudflare app is live and its counter displays a total. The public GitHub Pages preview is deployed from `main/docs` and embeds the live app.
- The GitHub source repository is public. The repository About description is “Noncommercial desktop-first Steam negative review browser.”
- A Google Search Console HTML meta verification tag has been committed to `index.html`; ownership verification and sitemap submission are still pending confirmation in Search Console.

## Do next

1. **Check the local preview on a slower connection.** Open the site through Wrangler, confirm the home page makes no new request while scrolling, and confirm only the button adds the next 15 games. Check that posters stay aligned and that search still loads more results as you scroll.
2. **Check a few more Steam cases.** Try a title with several editions, an empty result, and a Steam timeout or rate limit. Confirm app names and store links still refer to the same game.
3. **Review Steam's current attribution and API terms before sharing more widely.** Search results use a public Steam Store route that is not a documented API and may change.

## Later improvements to consider

- Measure first-visit load time and image bytes on the actual hosted site before adding more caching or changing the filtering strategy. A cold request still has to check Steam's candidate games for English negative reviews.
- Add a small server-side health/error log if Steam failures become hard to diagnose. Keep the counter aggregate-only; avoid visitor identifiers and search histories.
- Decide whether popular games need a minimum number of negative reviews; this changes which games can appear and should be based on observed results.
- Revisit mobile layout only when mobile support becomes part of the project scope; desktop remains the current priority.

## Known limits

- Steam's Store search route and art paths can change without notice.
- Cache refresh can briefly show Steam lists or suggestions up to about 20 minutes old.
- The first visit may take longer than a cached visit because eligibility is checked against Steam.
- The page-view total counts reloads and automated requests, so treat it as an informal counter rather than a unique-viewer metric.
