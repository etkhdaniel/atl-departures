# ATL Departures

ATL flight fare tracker using SerpApi Google Flights.

Live site: [atldepartures.evadaniel.com](https://atldepartures.evadaniel.com/).

This repository contains the original Sites application source: the page, browser JavaScript, flight-search API, D1 database schema and migrations, and Sites/Cloudflare build integration. Copying the source here does not move the live deployment or synchronize future GitHub changes with Sites. Runtime secrets and database contents are not included.

## Development

Use Node.js 24 and pnpm 11.25.0 (the version pinned in package.json).

```sh
pnpm install --frozen-lockfile
pnpm dev
```

The application uses a Cloudflare D1 binding named `DB`. Apply the SQL in `drizzle/0000_futuristic_prima.sql` to the database used by your development or deployment environment. Configure `KEY_ENCRYPTION_SECRET` as a runtime secret containing at least 32 ASCII characters before saving a key through the UI; alternatively configure `SERPAPI_API_KEY` as a runtime secret. Do not commit either value. The `.openai/hosting.json` manifest retains the existing Sites identity and database binding.

```sh
node --experimental-strip-types tests/flights.test.ts
node --experimental-strip-types tests/api.test.mjs
node --check public/app.js
pnpm build
```

The tests simulate the provider and do not perform paid searches. The server requires the Sites/Cloudflare runtime; GitHub Pages alone cannot run its API or database. Production authentication and runtime bindings must be configured through the hosting platform.

## Behavior and hosting

Open the deployed site, enter your SerpApi key in Connect SerpApi, select exact outbound and return dates, and click Check fare. The key is encrypted in D1 with AES-GCM using the hosting secret KEY_ENCRYPTION_SECRET. It is never returned to the client. SERPAPI_API_KEY may alternatively be configured as a hosting secret.

Manual searches only. No unattended refresh or automated post publishing is enabled. Each destination/date pair is cached for 24 hours. Requests are atomically capped at 240 per UTC calendar month for this site; the provider billing cycle and usage elsewhere may differ. Failed attempts count conservatively. The provider still enforces its own limit. Changing API keys does not reset the site counter.

The site preserves only normalized returned fare options and timestamps. A round-trip quote does not confirm the return itinerary or booking availability. Baselines use prior observations for matching dates, economy, one adult and USD, within 90 days. At most the latest 2,000 observations are returned to the UI. Price history starts empty.

Access is configured separately in Sites. At the time of this import, the live site's access mode is public. Key updates require visitor identity and same-origin requests. Review hosting access settings before changing the deployment.

Validation: node --experimental-strip-types tests/flights.test.ts; node tests/api.test.mjs; node --check public/app.js; Sites production build. API integration tests use a simulated provider, not paid searches.
