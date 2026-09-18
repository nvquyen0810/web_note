# Web Note

Internal wiki / knowledge base (Notion + Confluence style) — Foundation + Core Wiki MVP.

Monorepo: Next.js (`apps/web`) + NestJS (`apps/api`) + shared Zod/types (`packages/shared`).

## Prerequisites

- Node.js **20+**
- [pnpm](https://pnpm.io/) **9+** (`packageManager` is pinned in `package.json`)
- Docker + Docker Compose

## Quick start

### 1. Environment

```bash
cp .env.example .env
```

Edit `NEXTAUTH_SECRET` to a long random string before sharing the stack beyond local use.

Symlinks (already used in this repo layout):

- `apps/web/.env` → `../../.env`
- `apps/api/.env` → `../../.env`

If missing:

```bash
ln -sf ../../.env apps/web/.env
ln -sf ../../.env apps/api/.env
```

### 2. Infrastructure

```bash
docker compose up -d
```

Starts Postgres (+ pgvector), Redis, Keycloak, MinIO (+ bucket init).

Wait until Keycloak responds:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/realms/webnote
# expect 200
```

### 3. Install & migrate

```bash
pnpm install
pnpm --filter @web-note/shared build
pnpm db:migrate
```

### 4. Run apps

```bash
pnpm dev
```

| Service   | URL |
|-----------|-----|
| Web       | http://localhost:3000 |
| API       | http://localhost:3001 |
| Swagger   | http://localhost:3001/docs |
| Keycloak  | http://localhost:8080 |
| MinIO API | http://localhost:9000 |
| MinIO UI  | http://localhost:9001 |

### 5. Demo login

Keycloak realm `webnote` ships with:

| Field    | Value |
|----------|-------|
| Username | `demo` |
| Password | `demo` |
| Email    | `demo@example.com` |

Open http://localhost:3000 → **Sign in with Keycloak**.

Keycloak admin console (separate): `admin` / `admin`.

### 6. Optional demo seed

After the demo user has signed in once (so `/me` synced the user row):

```bash
pnpm db:seed
```

Creates **Demo Workspace** → folder **Getting started** → document **Welcome**.

## Useful commands

```bash
pnpm lint                 # typecheck packages
pnpm test                 # unit / vitest
pnpm --filter @web-note/api test:e2e
pnpm build                # production builds
pnpm db:migrate           # Drizzle migrations
pnpm db:seed              # optional demo content
```

## Smoke checklist (MVP success criteria)

See [`.superpowers/sdd/mvp-smoke-checklist.md`](.superpowers/sdd/mvp-smoke-checklist.md).

## Architecture (MVP)

- **Auth:** Keycloak OIDC → Auth.js (web) → Bearer JWT → Nest API
- **Data:** PostgreSQL via Drizzle (documents, revisions, versions, ACL, audit)
- **Files:** MinIO presigned upload (images); Postgres stores metadata only
- **Editor:** Tiptap (autosave draft, publish → version snapshot, restore → draft)
- **Out of scope:** OpenSearch, WebSocket collab, AI/RAG, rich non-image files

Design: [`docs/superpowers/specs/2026-09-04-wiki-knowledge-base-mvp-design.md`](docs/superpowers/specs/2026-09-04-wiki-knowledge-base-mvp-design.md)  
Plan: [`docs/superpowers/plans/2026-09-04-foundation-core-wiki.md`](docs/superpowers/plans/2026-09-04-foundation-core-wiki.md)

## Ports reference

| Port | Service |
|------|---------|
| 3000 | Next.js web |
| 3001 | NestJS API |
| 5432 | Postgres |
| 6379 | Redis |
| 8080 | Keycloak |
| 9000 | MinIO S3 |
| 9001 | MinIO console |
