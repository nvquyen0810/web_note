# Task 14 Report: Swagger, seed, README, smoke checklist

## Status

Complete — Foundation + Core Wiki plan Tasks 1–14 done.

## Delivered

- Swagger UI at `/docs` (Bearer auth); CORS for web origin
- `pnpm db:seed` — demo workspace/folder/doc after demo user first login
- Root `README.md` — local setup, ports, demo credentials, commands
- `.superpowers/sdd/mvp-smoke-checklist.md` — success criteria from spec §1

## Verification

- `pnpm --filter @web-note/api lint` + `build` passed
- `GET /docs` and `/docs-json` return 200

## Commit

`docs: README local setup, Swagger, MVP smoke checklist`
