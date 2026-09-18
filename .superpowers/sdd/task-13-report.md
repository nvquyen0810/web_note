# Task 13 Report: Tiptap editor + autosave + publish + versions

## Status

Complete.

## Delivered

- `useAutosave` (1.5s debounce) + Vitest coverage
- Wiki editor: StarterKit, tasks, table, code+lowlight, callout, image, Mermaid node view
- Document page: title, Draft/Published badge, Saving/Saved indicator, Publish
- Version panel with restore → reload editor content
- Image upload: presign → PUT MinIO → complete → insert
- MinIO bucket CORS for `localhost:3000` browser uploads

## Verification

- `pnpm --filter @web-note/web test` — 1 passed
- `pnpm --filter @web-note/web lint` — passed
- `pnpm --filter @web-note/web build` — passed

## Commit

`feat(web): Tiptap editor, autosave, publish, versions, images`
