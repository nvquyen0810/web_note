# Task 3 Report: Drizzle Schema and Migrations

## Status

Implemented and committed on branch `dev`.

Implementation commit: `885eda6 feat(api): add Drizzle schema and migrations`

## Changes

- Added all ten MVP tables: `users`, `workspaces`, `workspace_members`,
  `folders`, `documents`, `document_revisions`, `document_versions`,
  `document_members`, `files`, and `audit_logs`.
- Added `workspace_role` from the shared `WORKSPACE_ROLES` contract and the
  `document_status` enum with only `draft` and `published`.
- Added foreign keys, member/version uniqueness constraints, query indexes,
  folder/document soft-delete timestamps, and JSONB document content.
- Kept file binaries outside PostgreSQL; `files` stores metadata only.
- Added a typed, global NestJS `DatabaseModule` with injectable `DATABASE`.
- Added Drizzle configuration and `db:generate` / `db:migrate` package scripts.
- Generated `src/database/migrations/0000_special_chat.sql` and Drizzle metadata.
- Added a schema export/enum smoke test that does not require PostgreSQL.

## TDD Evidence

RED:

```text
pnpm --filter @web-note/api test -- --runInBand src/database/schema/schema.spec.ts
Exit code: 1
TS2307: Cannot find module 'drizzle-orm'
TS2307: Cannot find module './index'
```

GREEN:

```text
PASS src/database/schema/schema.spec.ts
Tests: 2 passed, 2 total
```

## Verification

- Shared build: passed.
- API Jest suite: passed, 2 suites and 3 tests.
- API Nest build: passed.
- API strict TypeScript lint/typecheck: passed.
- `pnpm --filter @web-note/api db:generate`: passed; generated 10 tables.
- IDE diagnostics for edited API files: no errors.

## Migration Attempt

`pnpm --filter @web-note/api db:migrate` was attempted but could not run live.
This host has no `docker` executable and no `DATABASE_URL` was set, so no
reachable PostgreSQL instance was available. The generated SQL is committed and
the database-independent schema smoke test passed.

## Scope and Concerns

- No comments, notifications, embeddings, or binary-content tables were added.
- The pre-existing uncommitted `packages/shared/tsconfig.json` change was
  preserved and excluded from the implementation commit.
- Remaining concern: execute `db:migrate` against PostgreSQL when one is
  available to complete live integration verification.
