# Caching report — TrackFlow monorepo

Branch `feature/caching-optimisation`. Every decision below is backed by a measurement taken on this branch; how to reproduce them is at the end.

## 1. How we measured

- **Timing middleware** in `services/api/main.py`: one log line per request (`[timing] GET /suppliers → 200 | 89.0ms | cache=HIT`) and a `Server-Timing: app;dur=…` header with the API's own processing time.
- **Realistic volume**: `scripts/seed_load.py` fills a scratch TinyDB file with **20,000 incidents** (BRIEFING categories, statuses, origins and branches in a realistic mix, `created_at` spread over 18 months) and **1,500 suppliers** (US and Spain, 1–3 categories each, the right currency per country, 85 % active). The development database had 95 incidents and 15 suppliers, where every endpoint answers in ~4 ms and nothing looks like a candidate.
- **Burst of identical requests**: `scripts/bench_cache.py` logs in and calls each read endpoint 30 times in a row, like a dashboard being refreshed, and reports median and p95 of `Server-Timing`.

| Endpoint | 95 incidents / 15 suppliers | 20k / 1.5k, no cache | 20k / 1.5k, with cache | Hits |
|---|---|---|---|---|
| `GET /api/incidents/summary` | 3.8 ms | **261.5 ms** (p95 351) | **77.9 ms** (p95 122) | 29/30 |
| `GET /suppliers` | 3.7 ms | **348.0 ms** (p95 428) | **89.0 ms** (p95 132) | 29/30 |
| `GET /suppliers?country=Spain` | 3.3 ms | 289.8 ms (p95 392) | 83.5 ms (p95 106) | 29/30 |
| `GET /api/incidents` | 5.0 ms | 685.5 ms (p95 799) | 633.8 ms (not cached) | — |
| `GET /auth/me` | 3.6 ms | 303.1 ms (p95 397) | 259.6 ms (not cached) | — |

The cached endpoints are **~70–75 % faster** at the median. They do not reach ~0 ms because every authenticated request still runs `get_current_user`, which looks the user up in TinyDB — and TinyDB re-reads and parses the whole 8 MB JSON file on each query. That ~75 ms floor is visible in `GET /auth/me` too, which does nothing else. See section 5.

## 2. Backend inventory

Cost is measured at 20k incidents / 1.5k suppliers; frequency is estimated from how the backoffice uses each endpoint; stability is how often the underlying data changes.

| Endpoint | (a) Cost | (b) Frequency | (c) Data changes | Decision |
|---|---|---|---|---|
| `GET /api/incidents/summary` | High: reads every incident and counts 4 dimensions (262 ms) | Very high: loaded on every visit to `/incidents` and **again after every status change** (`refreshKey`) | On create / status change only | **Cached, 30 s** |
| `GET /suppliers` (+ `country`, `category`) | High: reads all suppliers, filters, serialises 1,500 rows (348 ms) | High: every visit to `/suppliers` and every filter change | Rarely: a few rate or status edits per day | **Cached, 5 min, key = filters** |
| `GET /api/incidents` (+ filters) | Highest (686 ms) | High | Constantly: status changes, new incidents from the support team | Not cached (section 4) |
| `GET /api/incidents/{id}` | Medium (single read, but full-file parse) | Low | Constantly | Not cached |
| `GET /suppliers/{id}`, `GET /suppliers/{id}/status-history` | Medium | Low (not used by the UI) | Rarely | Not cached: no traffic to justify it |
| `GET /auth/me`, `GET /profiles/me`, `GET /users/{id}` | Medium | High (`/auth/me` on every page load) | Rarely | Not cached: per-user data (section 4) |
| `GET /users` | Medium | Very low (admin only) | Rarely | Not cached |
| `GET /api/incidents/results/export` | Low (returns the last analysis) | Low | Each upload | Not cached |
| `POST`/`PUT`/`PATCH`/`DELETE` (all) | — | — | They *are* the changes | Never cached; they invalidate |

## 3. Backend decisions

Implementation: `services/api/cache.py` — an in-process `TTLCache` (thread-safe dict, every entry with an expiry, bounded to 256 entries with LRU eviction, invalidation by namespace). Both endpoints add `X-Cache: HIT|MISS`. `API_CACHE_ENABLED=false` turns it off (used for the "no cache" column and as an operational kill switch).

**Why in-process and not Redis.** The API runs as one Uvicorn process (`--workers 1` in `docker-compose.prod.yml`) over a local TinyDB file. A dict in memory is the simplest correct option and adds no infrastructure. The day the API runs with several workers or replicas, each process would hold its own copy and an invalidation would only reach one of them: that is the moment to move to Redis (same TTLs, `DEL` by key prefix).

### `GET /api/incidents/summary` — TTL 30 s

- **Cost**: 262 ms median, linear in the number of incidents.
- **Frequency**: the incidents page requests it on load and after every status change; with several support agents working the queue it is the most repeated request in the log.
- **Key**: a single shared key. The summary contains only counts — no personal data and nothing that varies per user — and the endpoint is already restricted to authenticated users by the router dependency. A test checks the cache never bypasses authentication.
- **Invalidation**: `POST /api/incidents` and `PATCH /api/incidents/{id}/status` drop the entry, so changes made through the API show up on the next request.
- **TTL**: 30 s is the upper bound for changes that do not go through the API (the CSV seeder `scripts/seed_incidents.py` writes to TinyDB directly from another process).

### `GET /suppliers` — TTL 5 min, key per filter combination

- **Cost**: 348 ms median for the full list, ~290 ms with a country filter.
- **Frequency**: every visit to the directory and every change of the country or category filter.
- **Key**: `(country, category)`, so the 3 × 9 possible combinations are cached independently. The directory is the same for every authenticated user, so the filters are the only thing the response depends on.
- **Invalidation**: create, rate change, status change and delete all drop the whole `suppliers:list` namespace — a rate change can affect any filtered list containing that supplier, so clearing every variant is simpler and always correct.
- **TTL**: 5 min, see the tradeoff below.

## 4. Tradeoffs acknowledged

**Supplier list: 5 minutes of possible staleness.** Writes made through the API invalidate immediately, so in normal use nobody sees old data. The 5 minutes only apply to changes that bypass the API — `uv run seed`, a manual edit of the JSON file, or (in the future) a second API worker. Supplier rates are negotiated per contract and change a few times a month, and a procurement user who sees a rate up to 5 minutes old loses nothing: no shipment is priced from this screen. In exchange, the most visited operations screen goes from 348 ms to 89 ms. If rates ever drive automatic pricing, this TTL must go down or the cache must be removed.

**Incident summary: 30 seconds.** Support agents watch these counters to see the queue move, so freshness matters more than for suppliers; 30 s matches the time an agent takes to handle a status change, and API writes invalidate anyway.

### What was not cached, and why

- **`GET /api/incidents` (the list)**: it is the slowest endpoint (686 ms), but its data changes all day — every status change rewrites a row — and its response is the full list (several MB with 20k rows). Caching it would mean keeping a large object per filter combination that is invalidated almost as often as it is read. The fix that pays here is pagination plus a real database (inventory already moved to PostgreSQL in Milestone 5), not a cache.
- **`GET /auth/me` and the user lookup in `get_current_user`**: this is the ~75 ms floor in every request, so it was considered first. It was rejected because it is session-specific, security-relevant data: a cached user record would keep a deactivated account or a demoted admin working until the TTL expires. A shared key would be a data leak; a per-user key would still delay revocations. The proper fix is to stop parsing the whole TinyDB file per request (TinyDB's `CachingMiddleware` with an explicit flush, or moving users to PostgreSQL).
- **`POST /api/incidents/analyze`**: a different CSV every time; nothing to reuse.

## 5. Frontend decisions

### Lazy loading (`next/dynamic`)

Measured in Chrome against the production build (`next start`), counting `/_next/static/chunks/*.js` downloads:

| Component | Where | Why defer it | Measured |
|---|---|---|---|
| `components/SupplierCreateForm.tsx` | `/suppliers`, behind a "+ Nuevo proveedor" button | Most visits to the directory are to look up or update rates; creating a supplier is occasional. Before, the form and its 8 state hooks lived in the page component, so **every keystroke in the form re-rendered the 1,500-row table**. Moving it to its own lazily loaded component removes that cost as well. | Not in the first load; 1 chunk (3.0 KB) downloaded when the button is pressed |
| `components/AnalysisResults.tsx` | `/incidents-analysis`, rendered only after a CSV has been analysed | The metric cards and five breakdowns are only needed after an upload, which most visits never do. | Not in the first load; 1 chunk (2.5 KB) downloaded when the first result arrives |

Honest note on size: both chunks are small (the first load of each page is ~495 KB, almost all of it the shared Next/React runtime), so the byte saving is modest today. The value is that these flows stop costing anything to users who never open them, and that they will not grow the main bundle as they gain features. Shared helpers (`lib/suppliers.ts`, `lib/incident-analysis.ts`) were moved out of the lazy components, because a static import from the page would have pulled them back into the main bundle.

### `useMemo` — supplier search, sort and totals

`/suppliers` now has a client-side search (name, zone or email, accent-insensitive) and a sort selector (name, rate, last update), plus active/suspended totals. The derived `view` is computed with `useMemo(…, [suppliers, search, sortKey])`.

- **Why it is worth it**: the page re-renders on every keystroke in a rate input (`rateDrafts` state), on each busy/notice change and on every status toggle. Without memoisation, each of those renders would normalise and filter 1,500 strings and re-sort the list. Measured with the load data: **1.2 ms per recomputation without a search, 1.6 ms with one** on a development machine — roughly 5–10 ms on a mid-range phone, a large share of a 16 ms frame, repeated on every keystroke.
- **Dependencies**: only the data and the two controls that change the result. `rateDrafts`, `busySupplierId`, `notice` and `error` are deliberately not dependencies.
- **Not memoised**: the per-row `formatRate` and `toLocaleString` calls. They are cheap on their own, and wrapping them would add complexity without a measurable gain.

## 6. Reproduce

```bash
# Load data (scratch file, never your real data/)
SUPPLIERS_DB_PATH=/tmp/load.json uv run --project services/api python scripts/seed_load.py

# API with and without cache
cd services/api
SUPPLIERS_DB_PATH=/tmp/load.json API_CACHE_ENABLED=false uv run uvicorn services.api.main:app --app-dir ../.. --port 8000
python ../../scripts/bench_cache.py --runs 30      # in another terminal; then restart with API_CACHE_ENABLED=true

# Tests (TTL expiry, invalidation by namespace, both endpoints, auth still enforced)
uv run pytest tests/test_cache.py
```
