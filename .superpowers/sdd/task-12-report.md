# Task 12 Report: Frontend shell

## Status

Complete.

## Delivered

- `apiFetch` + server actions for create workspace / folder / document
- Tailwind + shadcn-style UI: button, input, badge, dialog, dropdown
- Auth landing → `/workspaces` list + create dialog
- Workspace shell: switcher, folder/document tree, members settings, document placeholder
- Routes: `/`, `/workspaces`, `/w/:id`, `/w/:id/settings/members`, `/w/:id/d/:docId`

## Verification

- `pnpm --filter @web-note/web lint` (tsc) passed
- `pnpm --filter @web-note/web build` passed

## Commit

`feat(web): app shell, workspace switcher, folder tree`
