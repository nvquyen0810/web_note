# Task 9 Report: Version list + restore

## Status

Complete.

## Delivered

- `GET /documents/:id/versions` — metadata list (newest first)
- `GET /documents/:id/versions/:version` — full snapshot including content
- `POST /documents/:id/versions/:version/restore` — copy snap into revision, set title, **status = draft**, insert new version with `restoredFromVersion`, audit `document.restore`
- Methods live on `DocumentsService` (plan allowed)

## Tests

- `src/versions/restore.spec.ts`: restore v1 after v2 → v3 linked to 1, draft status
- Full API unit suite: 34 passed
- Lint/typecheck: passed

## Commit

`feat(api): document version history and restore`
