# Task 11 Report: Document ACL + private + audit API

## Status

Complete.

## Delivered

- `PATCH /documents/:id` — `isPrivate` (creator or workspace admin/owner only)
- `GET/PUT /documents/:id/members` — document ACL; PUT replaces membership set
- List documents filters private via `getEffectiveDocumentAccess` (creator, document_members, or workspace owner)
- Creator without workspace/doc membership falls back to `editor` role
- `GET /workspaces/:workspaceId/audit-logs` — admin+; paginated `{ items, total, limit, offset }`
- Shared: `updateDocumentSchema.isPrivate`, `putDocumentMembersSchema`

## Tests

- E2E `private-documents.e2e-spec.ts`: workspace admin does not see editor’s private doc; creator does
- Full API: 35 unit + 6 e2e passed; lint + shared build passed

## Commit

`feat(api): document ACL, private docs, audit log API`
