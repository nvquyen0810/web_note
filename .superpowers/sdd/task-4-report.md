# Task 4 Report: Keycloak authentication

## Status

Implemented Keycloak JWT authentication, database-backed user synchronization,
protected `GET /me`, Auth.js v5 Keycloak sign-in, and a local realm import.

## Implementation

- The API validates RS256 access tokens against the realm JWKS and issuer.
- Valid token claims are upserted into `users` by Keycloak subject.
- `GET /me` returns the synchronized user and returns the project error shape
  with HTTP 401 when authentication is absent.
- The web app stores the provider access token in the Auth.js session, presents
  Keycloak sign-in/sign-out actions, and calls the API `GET /me` endpoint.
- Compose imports `docker/keycloak/realm-webnote.json`. The local demo account is
  documented in `docker/keycloak/README.md`.

## Verification

- `pnpm --filter @web-note/api test:e2e --runInBand`: 2 passed (401 and 200).
- `pnpm --filter @web-note/api test -- --runInBand`: 3 passed.
- API TypeScript check and Nest build passed.
- Web TypeScript check and Next production build passed; `/` and the Auth.js
  route were detected.
- Realm JSON parsing passed.

## Self-review and concerns

- Scope is limited to authentication and user sync; no workspace or document
  behavior was added.
- No live Keycloak login was attempted because Docker is unavailable on this
  host. The compose command itself could not be executed for the same reason.
- The local Auth.js client is confidential because the required server-side
  provider configuration uses a client secret.

## Review fixes

- Commit `99a71ed` adds unit coverage for `JwtStrategy.validate` through
  `UsersService.upsertFromClaims`, including insert and conflict-update behavior.
- Access-token identity mapping now falls back to an email-shaped
  `preferred_username` and derives names from standard Keycloak claim variants.
- User synchronization failures now return HTTP 500 with
  `{ code: "USER_SYNC_FAILED", message: "User synchronization failed" }`.
- `pnpm --filter @web-note/api test -- --runInBand`: 10 passed.
- `pnpm --filter @web-note/api test:e2e -- --runInBand auth-me.e2e-spec.ts`:
  1 passed (401).
- `pnpm --filter @web-note/api lint`: passed.

## Important Task 4 follow-up

- Commit `caf3e81` fixes Important Task 4 review findings.
- `AuthGuard.handleRequest` now rethrows `HttpException` errors (including
  `USER_SYNC_FAILED` 500) instead of mapping every failure to 401.
- Restored authenticated `GET /me` e2e coverage via an `AuthGuard` override
  that injects a mock user and asserts HTTP 200 plus the user body.
- Added `auth.guard.spec.ts` covering `USER_SYNC_FAILED` rethrow, invalid-token
  rethrow, and missing-user 401 mapping.
- `pnpm --filter @web-note/api test -- --runInBand`: 15 passed.
- `pnpm --filter @web-note/api test:e2e --runInBand`: 2 passed (401 and 200).
