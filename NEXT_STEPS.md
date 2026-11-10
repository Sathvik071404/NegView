# NegView: recommendations and next steps

## Completed in this pass

- Home now loads another group of 15 only after **Next 15 Games** is clicked.
- Search keeps its existing scroll-to-load behavior.
- Game art uses Steam's standard 600 × 900 library poster, loads lazily, and decodes off the main thread.
- Search, suggestions, and popular-list responses can be reused for five minutes, with stale results allowed while the cache refreshes.
- The logo now reads as a review chat bubble with a negative mark. Page changes and newly added cards use short, reduced-motion-aware animations.
- The footer counts every page load, including refreshes, as an aggregate total in Cloudflare D1 without cookies or visitor identifiers.
- The D1 schema is applied in Cloudflare and local Wrangler; the local counter was checked for one-step increments and cross-origin rejection.

## Do next

1. **Check the local preview on a slower connection.** Open the site through Wrangler, confirm the home page makes no new request while scrolling, and confirm only the button adds the next 15 games. Check that posters stay aligned and that search still loads more results as you scroll.
2. **Check a few Steam cases before publishing.** Try a common search, a title with several editions, an empty result, and a Steam timeout or rate limit. Confirm app names and store links still refer to the same game.
3. **Deploy through Cloudflare Pages and verify the hosted counter.** Confirm the `VIEWS_DB` binding from `wrangler.toml` is active. The Steam routes also require Pages Functions, so a direct `file://` open cannot exercise search or reviews.
4. **Review Steam's current attribution and API terms before sharing publicly.** Search results use a public Steam Store route that is not a documented API and may change.

## Later improvements to consider

- Measure first-visit load time and image bytes on the actual hosted site before adding more caching or changing the filtering strategy. A cold request still has to check Steam's candidate games for English negative reviews.
- Add a small server-side health/error log if Steam failures become hard to diagnose. Keep the counter aggregate-only; avoid visitor identifiers and search histories.
- Decide whether popular games need a minimum number of negative reviews; this changes which games can appear and should be based on observed results.
- Revisit mobile layout only when mobile support becomes part of the project scope; desktop remains the current priority.

## Known limits

- Steam's Store search route and art paths can change without notice.
- Cache refresh can briefly show Steam lists or suggestions up to about 20 minutes old.
- The first visit may take longer than a cached visit because eligibility is checked against Steam.
