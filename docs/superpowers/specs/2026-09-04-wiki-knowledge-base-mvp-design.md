# Wiki / Knowledge Base — Foundation + Core Wiki Design

**Date:** 2026-09-04  
**Status:** Approved for planning  
**Scope:** Sub-project 1 — Foundation + Core Wiki (MVP)  
**Approach:** Vertical slice (end-to-end thin path first, then deepen)

## 1. Context and goals

Build an internal Notion + Confluence–style wiki for enterprise use. The full platform (files pipeline, OpenSearch, realtime collab, AI RAG) is intentionally phased. This document specifies only the first shippable MVP.

### Success criteria

A Keycloak user can:

1. Sign in via SSO (OIDC)
2. Create a workspace and manage members (Owner / Admin / Editor / Viewer)
3. Organize content as Workspace → Folder → Document
4. Create / edit / soft-delete / duplicate / move documents
5. Edit with a Notion-like Tiptap editor (headings, lists, checklist, table, code, callout, images, Mermaid)
6. Autosave drafts; publish; view version history; restore a prior version
7. Upload images to MinIO (metadata in PostgreSQL only)
8. Apply document-level permission overrides and private documents
9. See important actions in an audit log

### Out of scope (later sub-projects)

| Later phase | Deferred capabilities |
|-------------|----------------------|
| Files & Processing | Full file types, virus scan, OCR, thumbnails, BullMQ document pipeline |
| Search | OpenSearch full-text, semantic/pgvector query UI |
| Collaboration | WebSocket presence, concurrent editing, comments, @mentions, notifications |
| AI Knowledge Base | RAG chat, embeddings, citation-filtered answers |
| Permissions (full) | Groups, departments, Commenter role, folder-level ACL |

Commenter role and Group/Department ACL are reserved in product vision but **not implemented** in MVP.

## 2. Decisions locked in

| Topic | Choice |
|-------|--------|
| Delivery | Sequential sub-projects; start Foundation + Core Wiki |
| Auth | Keycloak (OIDC) in Docker Compose |
| Repo | pnpm + Turborepo monorepo: `apps/web`, `apps/api`, `packages/shared` |
| Permissions (MVP) | Workspace + Document (per user); basic audit; no Group/Department |
| Collaboration (MVP) | Autosave + draft/publish + version snapshots; no WebSocket/comments |
| Compose (MVP) | Postgres (+ pgvector extension ready), Redis, Keycloak, MinIO, API, Web — no OpenSearch yet |
| Implementation style | Vertical slice |

## 3. Architecture

```
Browser (Next.js)
    │  OIDC login
    ▼
Keycloak
    │  JWT (Bearer)
    ▼
NestJS API  ── Drizzle ── PostgreSQL (+ pgvector installed, unused for query yet)
    │              └── audit / users / wiki tables
    ├── Redis (reserved for cache/queue; light use OK in MVP)
    └── MinIO (editor image binary storage in MVP)
```

### Monorepo layout

```
web_note/
├── apps/web                 # Next.js App Router, Tailwind, shadcn/ui, Tiptap
├── apps/api                 # NestJS, Drizzle, REST, Swagger
├── packages/shared          # Zod schemas, role enums, shared DTO types
├── docker/                  # Keycloak realm export, Postgres init, MinIO bootstrap
├── docker-compose.yml
├── .env.example
├── docs/
└── package.json             # pnpm workspace + Turborepo
```

### Backend module boundaries

- `auth` — JWT validation (JWKS), user sync from token claims
- `workspaces` — CRUD + members
- `folders` — tree CRUD + move
- `documents` — CRUD, duplicate, move, content autosave, publish
- `versions` — list / restore snapshots
- `permissions` — effective role resolution (workspace ∪ document)
- `files` — upload metadata + MinIO put/presign (images first)
- `audit` — append-only important actions

### Frontend surface

- Auth.js (NextAuth v5) with Keycloak provider; session → API Bearer token
- Sidebar: workspace switcher, folder tree, document list
- Editor page: title, Tiptap body, draft/published badge, Publish, version panel
- Settings: workspace members, document share, private toggle
- Autosave indicator (debounced 1–2s)

### Content storage

- Document body: **Tiptap JSON** in PostgreSQL `jsonb`
- Binaries: **MinIO only**; Postgres stores metadata + `storageKey`

## 4. Data model

### Tables

| Table | Purpose |
|-------|---------|
| `users` | Local profile synced from Keycloak (`sub`, email, name, avatar URL) |
| `workspaces` | Top-level wiki space |
| `workspace_members` | Roles: `owner` \| `admin` \| `editor` \| `viewer` |
| `folders` | Nested folders (`parent_id` nullable), scoped to workspace |
| `documents` | Title, `folder_id`, `created_by` (user), `status` (`draft` \| `published`), `is_private`, soft-delete |
| `document_revisions` | Current working content (Tiptap JSON) + timestamps (autosave target) |
| `document_versions` | Immutable snapshots on publish / restore; monotonic `version` number |
| `document_members` | Per-document role overrides for specific users |
| `files` | MinIO object metadata (key, mime, size, uploader, optional `document_id`) |
| `audit_logs` | `actor_id`, `action`, `resource_type`, `resource_id`, `metadata` jsonb, `created_at` |

### Behavioral rules

1. **Soft-delete:** `deleted_at` on folders and documents.
2. **Autosave:** writes `document_revisions` only; does **not** create a version row.
3. **Publish:** copy current revision → new `document_versions` row; set `documents.status = published`.
4. **Restore:** copy chosen version content into `document_revisions`; record a new version marked as restored-from `vN` (keeps history linear and auditable).
5. **Private documents:** if `is_private = true`, visibility is limited to `created_by`, explicit `document_members`, and the workspace **Owner** role (recoverability). Workspace **Admin/Editor/Viewer** membership alone is **not** enough to see private docs.
6. **Effective permission:** if a `document_members` row exists for the user, use that role; else use `workspace_members` role (subject to private-document rule above).
7. **Role capabilities (MVP):**

| Capability | Owner | Admin | Editor | Viewer |
|------------|-------|-------|--------|--------|
| Manage workspace / members | ✓ | ✓ | | |
| Create/edit/delete folders & docs | ✓ | ✓ | ✓ | |
| Publish / restore versions | ✓ | ✓ | ✓ | |
| Read content | ✓ | ✓ | ✓ | ✓ |
| Manage document ACL / private flag | ✓ | ✓ | own docs* | |

\*Editors may set private/share only on documents they created, unless elevated by Admin/Owner.

## 5. API (REST)

All routes require Bearer JWT except health checks. Validation via Zod from `packages/shared`. OpenAPI via Swagger.

### Representative endpoints

- `GET /health`
- `GET /me` — sync/return current user
- Workspaces: `GET/POST /workspaces`, `GET/PATCH /workspaces/:id`, members CRUD under `/workspaces/:id/members`
- Folders: `GET/POST /workspaces/:id/folders`, `PATCH/DELETE /folders/:id`, `POST /folders/:id/move`
- Documents: CRUD under workspace/folder; `POST /documents/:id/duplicate`, `POST /documents/:id/move`
- Content: `PATCH /documents/:id/content` (autosave body)
- Lifecycle: `POST /documents/:id/publish`
- Versions: `GET /documents/:id/versions`, `GET /documents/:id/versions/:version`, `POST /documents/:id/versions/:version/restore`
- Files: `POST /files/presign` (browser uploads directly to MinIO), then `POST /files/complete` to persist metadata; `GET /files/:id` for authorized download URL
- Document ACL: `GET/PUT /documents/:id/members`, `PATCH /documents/:id` for `is_private`
- Audit: `GET /workspaces/:id/audit-logs` (Admin/Owner)

### Error shape

Consistent JSON: `{ "code": string, "message": string, "details"?: unknown }` with HTTP status mapping. Global NestJS exception filter; correlation/request id on responses and logs.

## 6. Editor capabilities (MVP)

Supported blocks/features:

- Headings, paragraphs, bold/italic/strike, links
- Bullet / ordered lists, checklist
- Tables
- Code blocks
- Callouts
- Images (upload → MinIO)
- Mermaid diagrams (client-side render)
- Markdown paste

Deferred: rich file attachments beyond images, deep embed cards, OCR, collaborative cursors.

## 7. Security

- No application passwords; Keycloak is the IdP
- NestJS: AuthGuard → PermissionGuard on every mutating and sensitive read path
- CORS allowlist; Helmet; basic API rate limiting
- MinIO private buckets; short-lived presigned URLs; mime/size allowlist for uploads
- Structured logging (pino); never log access tokens or raw document secrets
- `.env` / `.env.example` for all secrets and service URLs; no secrets in git

## 8. Infrastructure (local)

Docker Compose services:

- `postgres` (image with pgvector)
- `redis`
- `keycloak` (+ optional realm import for a demo client/users)
- `minio` (+ bucket init)
- `api` (NestJS)
- `web` (Next.js)

OpenSearch is **not** started in MVP compose.

## 9. Testing strategy (MVP)

- **Unit:** permission resolution; publish/restore state transitions
- **Integration:** document CRUD + auth gating against Postgres (testcontainers or compose test profile)
- **Frontend:** focused Vitest coverage for autosave/debounce and critical editor commands
- Full E2E and load tests deferred

## 10. Delivery order (vertical slices)

1. Monorepo + Compose + `.env.example` + tooling (TypeScript strict, ESLint, Prettier)
2. Auth E2E: Keycloak login → JWT → `GET /me` + user sync
3. Workspaces + members
4. Folders + documents CRUD (incl. duplicate/move/soft-delete)
5. Tiptap editor + autosave + draft/publish
6. Version history + restore
7. Image upload via MinIO
8. Document-level ACL + private flag + audit log writes/reads
9. Swagger polish, seed data, README “run locally”

## 11. Future alignment (non-goals now, design-compatible)

- BullMQ workers and Redis queues plug in beside `files` without schema rewrite
- OpenSearch indexer consumes document publish events later
- `pgvector` columns/tables for embeddings added when AI phase starts
- WebSocket gateway added for presence/collab without changing REST content model (Yjs/CRDT decision deferred to Collaboration phase)
- Entra ID can be added as a second OIDC provider behind the same JWT validation abstraction

## 12. Explicit non-goals for this MVP

- Production Kubernetes manifests
- Multi-region HA
- Virus scanning / OCR
- AI chat
- Realtime multiplayer editing
- OpenSearch-backed UI search (simple title filter in SQL is acceptable for MVP navigation only)
