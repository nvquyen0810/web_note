# Task 8 Report: Autosave content + publish

## Status

Complete.

## Delivered

- `PATCH /documents/:id/content` — autosave Tiptap JSON into `document_revisions`, optional title update; **does not** create version rows
- `POST /documents/:id/publish` — snapshot current revision into `document_versions` (`version = max+1`), set `status = published`, audit `document.publish`
- Permission: `requireDocumentAccess(..., 'edit')`
- Unit test `publish.spec.ts`: autosave leaves versions empty; publish creates v1 and sets published

## Tests

- Unit: 33 passed (including publish autosave case)
- E2e: 4 passed
- Lint/typecheck: passed

## Commit

`feat(api): document autosave and publish with version snapshot`
