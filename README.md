# NegView

NegView is a desktop-first browser for English negative Steam reviews. It is a noncommercial class project built with plain HTML, CSS, and JavaScript, plus Cloudflare Pages Functions for Steam requests.

## Features

- Browse Steam's current popular games in a desktop 5-by-3 grid, in pages of 15, showing games with at least one written English negative review.
- Search Steam games with live suggestions and scroll-loaded, paginated results.
- Open a game's English negative reviews, then continue through additional review pages.
- Pick a random Steam game that has at least one written English negative review.
- Switch between dark and light themes, with the choice saved locally in the browser.
- Use the floating search header, back-to-top control, privacy and terms pages, and custom 404 page.
- Navigate home, search, and game views in the same tab while retaining the previous scroll position.

## Run locally

From the project root, run:

```powershell
npx --yes wrangler pages dev .
```

Open the local URL printed by Wrangler. Opening `index.html` directly with `file://` only previews static layout; Steam search, popular games, random selection, and reviews need the Functions runtime.

## Deploy

Use **Cloudflare Pages connected to this GitHub repository**. GitHub Pages alone serves static files and cannot run NegView's `/api/*` Pages Functions.

Configure the Cloudflare Pages project with:

- Production branch: `main`
- Root directory: repository root
- Framework preset: `None`
- Build command: `exit 0`
- Build output directory: `.`

The `functions/api/` directory maps to `/api/` routes automatically. Cloudflare Pages can deploy from a private GitHub repository and will publish the `pages.dev` address after deployment. No Steam API key or other environment secret is needed.

### API routes

- `/api/popular-games` — paged Steam popular games filtered for English written negative reviews.
- `/api/search` — paged Steam Store search results with the same review eligibility filter.
- `/api/suggest` — live Store title suggestions.
- `/api/reviews` — paged English negative reviews for one Steam app ID.
- `/api/random-game` — random eligible Steam game.

Steam's Store search route is public but undocumented and may change. Steam supplies the game data, reviews, and artwork; their respective owners retain those rights.

## Project files

- `index.html`, `style.css`, `app.js`, `theme.js` — site interface and client-side navigation.
- `functions/api/`, `lib/steam.js` — Steam API proxy routes and shared eligibility checks.
- `privacy.html`, `terms.html`, `404.html` — legal information and missing-page screen.
- `PLAN.md`, `NEXT_STEPS.md` — product scope and recommendations for future work.
- `wrangler.toml` — Cloudflare Pages project settings.

## License

The original source code is licensed under the MIT License; see `LICENSE`. Steam game names, reviews, images, and trademarks are not covered by that license.
