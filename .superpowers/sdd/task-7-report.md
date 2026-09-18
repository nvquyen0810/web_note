# Task 7 Report: Folders + documents CRUD

## Status

Complete (on main checkout `/Users/MAC/Developer/web_note`, branch `dev`).

## Delivered

- `FoldersModule`: list/create under workspace; rename, move, soft-delete by folder id
- `DocumentsModule`: list/create under workspace; get (with revision content), update title/folder, soft-delete, duplicate, move
- Create inserts empty Tiptap revision `{ type: 'doc', content: [] }`, status `draft`
- Duplicate: deep-copies content, title `Copy of …`, status `draft`, no versions copied
- Soft-delete via `deleted_at`; list filters active rows and permission visibility
- `PermissionsService.requireDocumentAccess` for read/edit gates
- Shared schemas: `updateDocumentSchema`, `moveDocumentSchema`

## Tests

- Unit: 32 passed (includes soft-delete, duplicate, list visibility)
- E2e: 4 passed (create document + empty revision; workspaces; /me)
- `pnpm --filter @web-note/api lint` + `build` passed

## Concerns

- Folder soft-delete does not cascade soft-delete child folders/docs (children keep parent id until moved)
- Document list does N+1 permission checks (acceptable for MVP)
