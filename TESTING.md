# Testing — TrackFlow monorepo

Ticket **AUTH-088**: unit tests for every endpoint of the authentication API, plus the backlog tickets API-042 (backoffice endpoints) and FE-019 (frontend utilities).

## How to run

### API (FastAPI · pytest)

```bash
cd services/api
uv sync --group dev
uv run pytest tests                                   # all tests
uv run pytest tests --cov=services.api --cov-report=term-missing   # with coverage
```

Each test gets its own temporary TinyDB file (fixture `api_database` in `tests/conftest.py`), so tests never touch `data/` and can run in any order. No email is ever sent: Resend calls are replaced by fakes.

### Backoffice (TypeScript · Jest)

```bash
cd uis/backoffice
npm install
npm test            # jest --coverage
```

## Test plan

Every endpoint has at least one **happy path**, one **edge case** and one **failure mode**. The tests check what the API *decides* (who is let in, what gets stored, what is rejected), not how FastAPI serialises responses.

| Endpoint / unit | Module | Happy path | Edge cases | Failure modes |
|---|---|---|---|---|
| `POST /users` (register) | `test_register.py` | User created with role `user`, bcrypt hash (plain password never stored) and linked profile | Same email in another case is a duplicate; password kept exactly as typed, spaces included; password over 72 bytes (bcrypt limit) rejected | Duplicate email `409`; short password, invalid email, trying to set `role` → `422`, nothing stored |
| `POST /auth/login` | `test_login.py` | Token whose `sub` is the user id; expiry from config | Email casing ignored; empty password does not log in | Wrong password, unknown email and inactive account all get the **same** `401` (no account enumeration); missing field `422` |
| `security.py` (JWT + `get_current_user`) | `test_token.py` | Token encodes user and configured expiry; valid token resolves the user | Token of a deactivated or deleted user rejected; expiry setting must be a positive integer; secret under 32 chars refused | Malformed, expired, wrongly signed, non-numeric `sub`, missing `sub`, unsigned (`alg: none`) → `401` |
| `GET /auth/me` | `test_me.py` | Email, role and profile; no password hash | Role change visible with the same token | No profile `404`; no token `401` |
| `GET/PUT/DELETE /users[/{id}]` | `test_users.py` | Own account read/updated (email normalised); admin lists and deletes, profile removed too | Password change through `PUT` revokes pending reset links; email change to an existing one in other case `409`; empty update `422` | Regular user gets `403` on other accounts, on listing, and when trying to change own role or activation; admin gets `404` for unknown ids |
| `GET/PUT /profiles/me` | `test_profiles.py` | Partial update keeps other fields | Fields cleared with `null`; each user only sees their own profile | Empty body, too-long name, unknown field `422`; no token `401` |
| `POST /auth/forgot-password` | `test_password_reset.py` | Registered email receives a link to `/reset-password?token=…` | Unknown email gets the same `200` and body; any email casing matches; inactive account gets nothing; max 5 links per hour | Delivery failure still answers `200` (`test_email_service.py`) |
| `POST /auth/reset-password` | `test_password_reset.py` | New password works, old one stops working | Only the SHA-256 hash of the token is stored; a newer reset revokes older links; lifetime only 15–60 min | Reused token, expired token and unknown token → `400` |
| `POST /auth/change-password` | `test_password_reset.py` | New password works after change | New password equal to the current one `400` | No token `401`; wrong current password `400`; short new password `422` |
| `email_service.py` (Resend) | `test_email_service.py` | Request to Resend with bearer key, recipient, sender and link in HTML and text | Link HTML-escaped; without `RESEND_API_KEY` nothing is sent and the link is logged | Resend rejection and network errors raise `EmailDeliveryError` with the reason |

`test_auth.py` (the original end-to-end auth tests) is kept as a second safety net.

## Bugs found by the tests (fixed)

1. **Emails were case-sensitive.** `Ops.Lead@Example.com` and `ops.lead@example.com` could be registered as two accounts, and logging in or requesting a reset with different casing failed. Fix: `user_store.normalize_email()` lowercases emails on create, update and lookup; lookups also match accounts stored before the fix.
2. **Registration silently trimmed the password.** `UserCreate` strips whitespace from every string, so `"  spaced-password  "` was stored as `"spaced-password"` while login compared the exact text: the user could not log in with the password they chose. Fix: password fields use `RawPassword` (`strip_whitespace=False`) in `UserCreate` and `UserUpdate`.
3. **Changing the password with `PUT /users/{id}` did not revoke reset links.** Only the reset/change endpoints revoked them, so an old link in someone's inbox could still overwrite the new password. Fix: `user_store.update_user()` now stamps `password_changed_at` and revokes pending links on *any* password change.

Known limitation (not changed, documented): access tokens already issued stay valid until they expire (30 min) after a password change, because JWTs are stateless. Rejecting tokens with `iat` before `password_changed_at` would close it, at the cost of logging the user out of the session they used to change it.

## Coverage

`uv run pytest tests --cov=services.api` — **82 tests, all passing.**

| Authentication module | Coverage |
|---|---|
| `security.py` | 100% |
| `password_reset.py` | 100% |
| `routes/users.py` | 100% |
| `routes/auth.py` | 98% |
| `auth_models.py` | 97% |
| `email_service.py` | 97% |
| `user_store.py` | 92% |
| `routes/profiles.py` | 88% |

Target was 70% on the authentication module; every module is above 88%.

### API-042 — backoffice endpoints (extra)

| Module | Tests | Coverage |
|---|---|---|
| `routes/suppliers.py` | `test_suppliers.py`: CRUD, filters, currency/country rule, status history, auth | 95% |
| `routes/incidents.py` | `test_incidents.py`: create/list/filter, lifecycle transitions, summary, idempotent seed (95 inserted, 5 rejected) | 93% |
| `routes/incidents_analysis.py` | CSV upload and analysis | 72% |

All above the 60% target.

### FE-019 — frontend utilities (extra)

`uis/backoffice/__tests__/` — **17 tests**, `npm test`:

| Function | Happy path | Failure mode |
|---|---|---|
| `readJson` | Parses JSON | HTML error page or empty body → `null`, no exception |
| `fieldErrorsFrom` | FastAPI 422 `detail` → `{ field: message }`; `{field,message}` and `{errors:[]}` shapes | Non-object or field-less bodies → `{}` |
| `parseResponse` | Returns body of 2xx | 4xx shows the API's message; 5xx never leaks server text; 422 keeps per-field errors; 200 with non-JSON body rejected; 401 always shows the session message |
| `toUserMessage` | `ApiError` message as is | Network `TypeError` → connection message; anything else → fallback |
| `apiFetch` | Adds `Authorization: Bearer` when logged in | No header without a session; on `401` removes the token and fires `trackflow:unauthorized`; other errors keep the session |

Coverage of `lib/`: 98% of lines (`auth-client.ts` 100%, `http.ts` 98%).

## How AI was used

The test plan above (which cases matter for each endpoint) was written first. An AI coding agent then suggested extra edge cases from the endpoint code — email casing, whitespace in passwords, `alg: none` tokens, revocation through `PUT /users` — and generated the test boilerplate. Every test was reviewed and run; the three bugs above came out of those suggested cases.
