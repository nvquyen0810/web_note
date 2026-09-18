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
