# MVP smoke checklist

Manual verification against design spec §1 *Tiêu chí thành công*.

Mark each item when verified locally (Keycloak `demo` / `demo`).

| # | Criterion | Status | Notes |
|---|-----------|--------|-------|
| 1 | Đăng nhập SSO (OIDC / Keycloak) | [ ] | http://localhost:3000 → Sign in |
| 2 | Tạo workspace + quản lý thành viên (roles) | [ ] | `/workspaces`, settings → members list |
| 3 | Tổ chức Workspace → Folder → Document | [ ] | Sidebar tree + create folder/doc |
| 4 | Tạo / sửa / soft-delete / duplicate / move | [ ] | API covered; UI create+edit in MVP |
| 5 | Editor Tiptap (heading, list, checklist, table, code, callout, image, Mermaid) | [ ] | Document page toolbar |
| 6 | Autosave draft; publish; version history; restore | [ ] | Saving… / Publish / Versions panel |
| 7 | Upload ảnh MinIO (PG metadata only) | [ ] | Image toolbar; CORS on bucket |
| 8 | Document ACL + private flag | [ ] | API `PATCH isPrivate`, `PUT members` |
| 9 | Audit log các thao tác quan trọng | [ ] | `GET /workspaces/:id/audit-logs` (Swagger) |

## Quick API checks

- Health: `GET http://localhost:3001/health`
- OpenAPI UI: http://localhost:3001/docs (Authorize with Bearer access token)

## Automated tests (CI / local)

```bash
pnpm --filter @web-note/api test
pnpm --filter @web-note/api test:e2e
pnpm --filter @web-note/web test
pnpm --filter @web-note/web lint
```

## Verified in this delivery

Automated suites green as of Task 13–14 (unit/e2e/web vitest). Full manual UI pass is for the operator running the checklist above.
