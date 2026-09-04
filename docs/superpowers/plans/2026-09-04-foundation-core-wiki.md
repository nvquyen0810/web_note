# Foundation + Core Wiki MVP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng MVP wiki nội bộ (Foundation + Core Wiki): SSO Keycloak, workspace/folder/document, Tiptap autosave + publish + version history, ảnh MinIO, ACL document + audit.

**Architecture:** Monorepo pnpm/Turborepo (`apps/web`, `apps/api`, `packages/shared`). Next.js gọi NestJS REST bằng Bearer JWT từ Keycloak. PostgreSQL + Drizzle lưu metadata/nội dung Tiptap JSON; MinIO lưu binary ảnh. Vertical slice theo thứ tự task bên dưới.

**Tech Stack:** Next.js (App Router), React, TypeScript strict, Tailwind, shadcn/ui, Tiptap, Auth.js (NextAuth v5), NestJS, Drizzle ORM, PostgreSQL + pgvector (extension sẵn), Redis, MinIO, Keycloak, Docker Compose, Zod, Vitest/Jest, Swagger.

**Spec:** `docs/superpowers/specs/2026-09-04-wiki-knowledge-base-mvp-design.md`

## Global Constraints

- TypeScript `strict: true` trên mọi package/app
- Document body = Tiptap JSON (`jsonb`); binary chỉ ở MinIO
- Role MVP: `owner` | `admin` | `editor` | `viewer` (không có `commenter`)
- Private doc: chỉ `created_by` + `document_members` + workspace Owner được xem
- Autosave không tạo version; publish/restore mới tạo `document_versions`
- Không OpenSearch, WebSocket, AI, virus scan, OCR trong MVP
- Validation input qua Zod trong `packages/shared`
- Error API: `{ code, message, details? }`
- Commit nhỏ, có test trước khi đánh dấu task xong

---

## File map (tạo mới)

```
web_note/
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── .env.example
├── .gitignore
├── docker-compose.yml
├── docker/
│   ├── postgres/init.sql          # CREATE EXTENSION vector
│   ├── keycloak/realm-webnote.json
│   └── minio/create-bucket.sh
├── packages/shared/
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/index.ts
│   ├── src/roles.ts
│   ├── src/errors.ts
│   └── src/schemas/*.ts           # workspace, folder, document, file, …
├── apps/api/
│   ├── package.json
│   ├── nest-cli.json
│   ├── tsconfig.json
│   ├── drizzle.config.ts
│   ├── src/main.ts
│   ├── src/app.module.ts
│   ├── src/common/                # filters, guards, interceptors, logger
│   ├── src/database/              # drizzle module, schema/, migrations/
│   ├── src/auth/
│   ├── src/users/
│   ├── src/workspaces/
│   ├── src/folders/
│   ├── src/documents/
│   ├── src/versions/
│   ├── src/permissions/
│   ├── src/files/
│   ├── src/audit/
│   └── test/
└── apps/web/
    ├── package.json
    ├── next.config.ts
    ├── src/app/                   # routes, auth
    ├── src/components/            # sidebar, editor, version-panel
    ├── src/lib/api.ts             # fetch wrapper + Bearer
    └── src/auth.ts                # Auth.js config
```

---

### Task 1: Scaffold monorepo + Docker Compose

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.gitignore`, `.env.example`
- Create: `docker-compose.yml`, `docker/postgres/init.sql`, `docker/minio/create-bucket.sh`
- Create: `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/shared/src/index.ts`
- Create: `apps/api` (NestJS tối thiểu `GET /health`), `apps/web` (Next.js tối thiểu trang `/`)

**Interfaces:**
- Consumes: không
- Produces: `pnpm dev` chạy được turbo; Compose lên `postgres:5432`, `redis:6379`, `minio:9000`, `keycloak:8080`; API `GET /health` → `{ status: "ok" }`

- [ ] **Step 1: Root workspace files**

`pnpm-workspace.yaml`:
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

`package.json` (root):
```json
{
  "name": "web-note",
  "private": true,
  "packageManager": "pnpm@9.15.0",
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "turbo": "^2.3.0",
    "typescript": "^5.7.0"
  }
}
```

`turbo.json`:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**"] },
    "dev": { "cache": false, "persistent": true },
    "test": { "dependsOn": ["^build"] },
    "lint": {}
  }
}
```

`.gitignore`: `node_modules`, `.next`, `dist`, `.env`, `.turbo`, `coverage`

- [ ] **Step 2: `.env.example`**

```env
# Postgres
DATABASE_URL=postgresql://webnote:webnote@localhost:5432/webnote

# Redis
REDIS_URL=redis://localhost:6379

# MinIO
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=webnote
S3_REGION=us-east-1

# Keycloak
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=webnote
KEYCLOAK_CLIENT_ID=webnote-web
KEYCLOAK_CLIENT_SECRET=change-me
NEXT_PUBLIC_KEYCLOAK_URL=http://localhost:8080
NEXT_PUBLIC_KEYCLOAK_REALM=webnote
NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=webnote-web

# Apps
API_PORT=3001
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=change-me-to-a-long-random-string
AUTH_TRUST_HOST=true
```

- [ ] **Step 3: Docker Compose + init**

`docker/postgres/init.sql`:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

`docker-compose.yml` (services: `postgres` image `pgvector/pgvector:pg16`, `redis:7`, `minio/minio`, `minio-init`, `keycloak:26` với dev mode). Map ports 5432, 6379, 9000, 9001, 8080. Postgres env user/password/db = `webnote`. Volume mount `docker/postgres/init.sql` vào `/docker-entrypoint-initdb.d/`.

`docker/minio/create-bucket.sh`: dùng `mc` tạo bucket `webnote` private.

- [ ] **Step 4: Minimal API + Web**

Scaffold NestJS trong `apps/api` với module health:
```typescript
// apps/api/src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok' };
  }
}
```

Scaffold Next.js `apps/web` App Router, trang `/` hiển thị "Web Note".

Wire `packages/shared` export `export const APP_NAME = 'web-note' as const`.

- [ ] **Step 5: Verify**

```bash
cp .env.example .env
pnpm install
docker compose up -d postgres redis minio minio-init keycloak
pnpm --filter @web-note/api dev
curl -s http://localhost:3001/health
```

Expected: `{"status":"ok"}`

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-workspace.yaml turbo.json .gitignore .env.example docker-compose.yml docker packages apps
git commit -m "chore: scaffold monorepo, compose, health API"
```

---

### Task 2: `packages/shared` — roles, errors, Zod schemas

**Files:**
- Create: `packages/shared/src/roles.ts`
- Create: `packages/shared/src/errors.ts`
- Create: `packages/shared/src/schemas/workspace.ts`
- Create: `packages/shared/src/schemas/folder.ts`
- Create: `packages/shared/src/schemas/document.ts`
- Create: `packages/shared/src/schemas/file.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/src/roles.test.ts`

**Interfaces:**
- Consumes: không
- Produces:
  - `WorkspaceRole = 'owner' | 'admin' | 'editor' | 'viewer'`
  - `roleAtLeast(role, minimum): boolean`
  - `canManageMembers(role): boolean`
  - `canEditContent(role): boolean`
  - `ApiErrorBody = { code: string; message: string; details?: unknown }`
  - Zod: `createWorkspaceSchema`, `createFolderSchema`, `createDocumentSchema`, `updateDocumentContentSchema`, `presignFileSchema`, …

- [ ] **Step 1: Failing test cho role hierarchy**

```typescript
// packages/shared/src/roles.test.ts
import { describe, expect, it } from 'vitest';
import { roleAtLeast, canEditContent, canManageMembers } from './roles';

describe('roleAtLeast', () => {
  it('owner satisfies viewer', () => {
    expect(roleAtLeast('owner', 'viewer')).toBe(true);
  });
  it('viewer does not satisfy editor', () => {
    expect(roleAtLeast('viewer', 'editor')).toBe(false);
  });
});

describe('capabilities', () => {
  it('editor can edit, viewer cannot', () => {
    expect(canEditContent('editor')).toBe(true);
    expect(canEditContent('viewer')).toBe(false);
  });
  it('admin can manage members, editor cannot', () => {
    expect(canManageMembers('admin')).toBe(true);
    expect(canManageMembers('editor')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
pnpm --filter @web-note/shared test
```

- [ ] **Step 3: Implement roles + schemas**

```typescript
// packages/shared/src/roles.ts
export const WORKSPACE_ROLES = ['owner', 'admin', 'editor', 'viewer'] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

const RANK: Record<WorkspaceRole, number> = {
  owner: 40,
  admin: 30,
  editor: 20,
  viewer: 10,
};

export function roleAtLeast(role: WorkspaceRole, minimum: WorkspaceRole): boolean {
  return RANK[role] >= RANK[minimum];
}

export function canManageMembers(role: WorkspaceRole): boolean {
  return roleAtLeast(role, 'admin');
}

export function canEditContent(role: WorkspaceRole): boolean {
  return roleAtLeast(role, 'editor');
}
```

Thêm Zod schemas tối thiểu:

```typescript
// packages/shared/src/schemas/document.ts
import { z } from 'zod';

export const documentStatusSchema = z.enum(['draft', 'published']);

export const createDocumentSchema = z.object({
  title: z.string().min(1).max(500),
  folderId: z.string().uuid().nullable().optional(),
});

export const updateDocumentContentSchema = z.object({
  content: z.record(z.string(), z.unknown()), // Tiptap JSON doc
  title: z.string().min(1).max(500).optional(),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentContentInput = z.infer<typeof updateDocumentContentSchema>;
```

Tương tự cho workspace (name), folder (name, parentId), file presign (filename, mimeType, sizeBytes, documentId?).

- [ ] **Step 4: Tests PASS + commit**

```bash
pnpm --filter @web-note/shared test
git add packages/shared
git commit -m "feat(shared): roles, errors, zod schemas"
```

---

### Task 3: Drizzle schema + migrations

**Files:**
- Create: `apps/api/src/database/schema/*.ts` (users, workspaces, folders, documents, revisions, versions, members, files, audit)
- Create: `apps/api/drizzle.config.ts`
- Create: migration SQL qua `drizzle-kit generate`
- Create: `apps/api/src/database/database.module.ts`

**Interfaces:**
- Consumes: `WorkspaceRole` từ shared
- Produces: tables khớp spec §4; `Database` type injectable; lệnh `pnpm --filter @web-note/api db:migrate`

- [ ] **Step 1: Định nghĩa schema cốt lõi**

```typescript
// apps/api/src/database/schema/users.ts
import { pgTable, uuid, varchar, timestamp, text } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  keycloakSub: varchar('keycloak_sub', { length: 255 }).notNull().unique(),
  email: varchar('email', { length: 320 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

Các bảng còn lại (tóm tắt cột bắt buộc):

| Table | Cột chính |
|-------|-----------|
| `workspaces` | id, name, created_by → users, created_at, updated_at |
| `workspace_members` | id, workspace_id, user_id, role enum, unique(workspace_id,user_id) |
| `folders` | id, workspace_id, parent_id nullable, name, deleted_at |
| `documents` | id, workspace_id, folder_id nullable, title, created_by, status, is_private, deleted_at |
| `document_revisions` | document_id PK/FK, content jsonb, updated_at, updated_by |
| `document_versions` | id, document_id, version int, content jsonb, title, created_by, created_at, restored_from_version nullable |
| `document_members` | document_id, user_id, role, unique(document_id,user_id) |
| `files` | id, storage_key, mime, size_bytes, uploaded_by, document_id nullable, created_at |
| `audit_logs` | id, actor_id, action, resource_type, resource_id, workspace_id, metadata jsonb, created_at |

Dùng `pgEnum('workspace_role', ['owner','admin','editor','viewer'])` và `pgEnum('document_status', ['draft','published'])`.

- [ ] **Step 2: Generate + migrate**

```bash
pnpm --filter @web-note/api db:generate
pnpm --filter @web-note/api db:migrate
```

Expected: tables tồn tại trong Postgres.

- [ ] **Step 3: Smoke query test (integration nhẹ)**

Test insert user + workspace rồi select — hoặc script `db:studio` smoke thủ công + unit test schema export không undefined.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/database apps/api/drizzle.config.ts
git commit -m "feat(api): drizzle schema and migrations for wiki MVP"
```

---

### Task 4: Auth — Keycloak JWT + user sync + `GET /me`

**Files:**
- Create: `docker/keycloak/realm-webnote.json` (realm `webnote`, client `webnote-web` public + confidential API nếu cần, user demo)
- Create: `apps/api/src/auth/jwt.strategy.ts`, `auth.module.ts`, `auth.guard.ts`
- Create: `apps/api/src/users/users.service.ts`, `users.controller.ts` (`GET /me`)
- Create: `apps/web/src/auth.ts`, `apps/web/src/app/api/auth/[...nextauth]/route.ts`
- Test: `apps/api/test/auth-me.e2e-spec.ts` (mock JWT hoặc test token)

**Interfaces:**
- Consumes: `users` table
- Produces:
  - `AuthUser = { id: string; keycloakSub: string; email: string; name: string }`
  - `@CurrentUser()` decorator
  - `UsersService.upsertFromClaims(claims): Promise<AuthUser>`
  - Web: session với `accessToken` để gọi API

- [ ] **Step 1: Failing e2e — `GET /me` without token → 401**

```typescript
it('rejects unauthenticated /me', async () => {
  const res = await request(app.getHttpServer()).get('/me');
  expect(res.status).toBe(401);
});
```

- [ ] **Step 2: Implement JWT validation (JWKS từ Keycloak)**

```typescript
// jwt.strategy.ts — passport-jwt
// secretOrKeyProvider: jwks-rsa từ `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/certs`
// validate(payload) => usersService.upsertFromClaims({ sub, email, name, picture })
```

`GET /me` trả user đã sync.

- [ ] **Step 3: NextAuth Keycloak provider**

```typescript
// apps/web/src/auth.ts
import NextAuth from 'next-auth';
import Keycloak from 'next-auth/providers/keycloak';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Keycloak({
      clientId: process.env.KEYCLOAK_CLIENT_ID!,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
      issuer: `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}`,
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account?.access_token) token.accessToken = account.access_token;
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      return session;
    },
  },
});
```

Trang `/` có nút Sign in; sau login gọi `GET ${API}/me` với Bearer.

- [ ] **Step 4: Verify thủ công + test 401/200**

```bash
docker compose up -d keycloak
# login UI → copy access token → curl -H "Authorization: Bearer …" localhost:3001/me
```

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: Keycloak OIDC auth, user sync, GET /me"
```

---

### Task 5: Permissions resolver + audit helper

**Files:**
- Create: `apps/api/src/permissions/permissions.service.ts`
- Create: `apps/api/src/permissions/permissions.module.ts`
- Create: `apps/api/src/audit/audit.service.ts`
- Test: `apps/api/src/permissions/permissions.service.spec.ts`

**Interfaces:**
- Consumes: schema members/documents; `roleAtLeast`, `canEditContent` từ shared
- Produces:
  - `getEffectiveDocumentAccess(userId, documentId): Promise<{ role: WorkspaceRole; canRead: boolean; canEdit: boolean } | null>`
  - `requireWorkspaceRole(userId, workspaceId, minimum): Promise<WorkspaceRole>`
  - `AuditService.record({ actorId, action, resourceType, resourceId, workspaceId, metadata? })`

- [ ] **Step 1: Failing unit tests**

Cases:
1. Workspace editor, public doc → canEdit true
2. Workspace viewer, public doc → canEdit false, canRead true
3. Private doc, random workspace admin (không phải owner, không phải member doc) → canRead false
4. Private doc, workspace owner → canRead true
5. document_members editor override trên viewer workspace → canEdit true

- [ ] **Step 2: Implement resolver**

Pseudo:

```typescript
async getEffectiveDocumentAccess(userId: string, documentId: string) {
  const doc = await findDocument(documentId); // not deleted
  const wsMember = await findWorkspaceMember(doc.workspaceId, userId);
  const docMember = await findDocumentMember(documentId, userId);

  if (doc.isPrivate) {
    const isCreator = doc.createdBy === userId;
    const isWsOwner = wsMember?.role === 'owner';
    if (!isCreator && !docMember && !isWsOwner) return null;
  } else if (!wsMember && !docMember) {
    return null;
  }

  const role = docMember?.role ?? wsMember!.role;
  return {
    role,
    canRead: true,
    canEdit: canEditContent(role),
  };
}
```

- [ ] **Step 3: Tests PASS + commit**

```bash
git commit -m "feat(api): permission resolver and audit service"
```

---

### Task 6: Workspaces + members API

**Files:**
- Create: `apps/api/src/workspaces/*` (module, service, controller, dto)
- Test: `apps/api/test/workspaces.e2e-spec.ts`

**Interfaces:**
- Consumes: AuthUser, AuditService, shared workspace schemas
- Produces:
  - `POST /workspaces` → tạo workspace + member owner = current user
  - `GET /workspaces` → list workspaces user thuộc về
  - `GET/PATCH /workspaces/:id`
  - `GET/POST/PATCH/DELETE /workspaces/:id/members`

- [ ] **Step 1: Failing e2e — create workspace returns 201 with owner membership**

- [ ] **Step 2: Implement service**

```typescript
async create(userId: string, name: string) {
  return this.db.transaction(async (tx) => {
    const [ws] = await tx.insert(workspaces).values({ name, createdBy: userId }).returning();
    await tx.insert(workspaceMembers).values({
      workspaceId: ws.id,
      userId,
      role: 'owner',
    });
    await this.audit.record({
      actorId: userId,
      action: 'workspace.create',
      resourceType: 'workspace',
      resourceId: ws.id,
      workspaceId: ws.id,
    });
    return ws;
  });
}
```

Member mutations: chỉ `canManageMembers`; không được xóa owner cuối cùng; không demote owner cuối cùng.

- [ ] **Step 3: Tests PASS + commit**

```bash
git commit -m "feat(api): workspaces and members CRUD"
```

---

### Task 7: Folders + documents CRUD (duplicate/move/soft-delete)

**Files:**
- Create: `apps/api/src/folders/*`
- Create: `apps/api/src/documents/documents.service.ts` (CRUD phần metadata)
- Create: `apps/api/src/documents/documents.controller.ts`
- Test: `apps/api/test/documents.e2e-spec.ts`

**Interfaces:**
- Consumes: permissions, schemas
- Produces:
  - Folders: list tree, create, rename, move, soft-delete
  - Documents: create (kèm empty revision `{ type: 'doc', content: [] }`), get, patch title/folder, soft-delete, duplicate, move
  - `POST /documents/:id/duplicate` copy revision, title `"Copy of …"`, status `draft`
  - `POST /documents/:id/move` body `{ folderId: string | null }`

- [ ] **Step 1: Failing tests — create doc in folder; duplicate; soft-delete ẩn khỏi list**

- [ ] **Step 2: Implement**

Khi create document:

```typescript
await tx.insert(documents).values({ … status: 'draft', isPrivate: false, createdBy: userId });
await tx.insert(documentRevisions).values({
  documentId,
  content: { type: 'doc', content: [] },
  updatedBy: userId,
});
```

Duplicate: deep copy content jsonb; không copy versions.

Soft-delete: set `deleted_at`; list endpoints filter `deleted_at IS NULL`.

- [ ] **Step 3: Pass + commit**

```bash
git commit -m "feat(api): folders and documents CRUD, duplicate, move"
```

---

### Task 8: Autosave content + publish

**Files:**
- Modify: `apps/api/src/documents/documents.service.ts`
- Create: endpoints `PATCH /documents/:id/content`, `POST /documents/:id/publish`
- Test: `apps/api/src/documents/publish.spec.ts`

**Interfaces:**
- Consumes: `updateDocumentContentSchema`, permissions.canEdit
- Produces:
  - Autosave cập nhật `document_revisions` + optional title; **không** insert version
  - Publish: insert `document_versions` với `version = max+1`, set status `published`, audit `document.publish`

- [ ] **Step 1: Failing unit test**

```typescript
it('publish creates version 1 and does not run on autosave', async () => {
  await service.updateContent(docId, userId, { content: { type: 'doc', content: [] } });
  expect(await countVersions(docId)).toBe(0);
  await service.publish(docId, userId);
  expect(await countVersions(docId)).toBe(1);
  const doc = await getDoc(docId);
  expect(doc.status).toBe('published');
});
```

- [ ] **Step 2: Implement publish**

```typescript
async publish(documentId: string, userId: string) {
  await this.permissions.assertCanEdit(userId, documentId);
  return this.db.transaction(async (tx) => {
    const rev = await getRevision(tx, documentId);
    const next = (await maxVersion(tx, documentId)) + 1;
    await tx.insert(documentVersions).values({
      documentId,
      version: next,
      content: rev.content,
      title: /* current title */,
      createdBy: userId,
    });
    await tx.update(documents).set({ status: 'published', updatedAt: new Date() }).where(eq(documents.id, documentId));
    await this.audit.record({ action: 'document.publish', … metadata: { version: next } });
    return { version: next };
  });
}
```

- [ ] **Step 3: Pass + commit**

```bash
git commit -m "feat(api): document autosave and publish with version snapshot"
```

---

### Task 9: Version list + restore

**Files:**
- Create: `apps/api/src/versions/*` (hoặc methods trong documents)
- Test: `apps/api/src/versions/restore.spec.ts`

**Interfaces:**
- Consumes: document_versions, permissions
- Produces:
  - `GET /documents/:id/versions` → `[{ version, title, createdAt, createdBy, restoredFromVersion }]`
  - `GET /documents/:id/versions/:version` → full content
  - `POST /documents/:id/versions/:version/restore` → copy content vào revision + insert version mới với `restoredFromVersion`

- [ ] **Step 1: Failing test — restore v1 after v2 publish creates v3 linked to 1**

- [ ] **Step 2: Implement restore**

```typescript
async restore(documentId: string, version: number, userId: string) {
  await this.permissions.assertCanEdit(userId, documentId);
  const snap = await findVersion(documentId, version);
  if (!snap) throw NotFoundException({ code: 'VERSION_NOT_FOUND', message: '…' });
  return this.db.transaction(async (tx) => {
    await tx.update(documentRevisions).set({
      content: snap.content,
      updatedBy: userId,
      updatedAt: new Date(),
    }).where(eq(documentRevisions.documentId, documentId));
    await tx.update(documents).set({ title: snap.title, status: 'draft' /* hoặc giữ published — chọn: set draft để user re-publish */ });
    const next = (await maxVersion(tx, documentId)) + 1;
    await tx.insert(documentVersions).values({
      documentId,
      version: next,
      content: snap.content,
      title: snap.title,
      createdBy: userId,
      restoredFromVersion: version,
    });
    // Product rule: sau restore, status = draft để buộc review trước publish lại
  });
}
```

**Quy tắc chốt:** sau restore → `status = 'draft'`.

- [ ] **Step 3: Pass + commit**

```bash
git commit -m "feat(api): document version history and restore"
```

---

### Task 10: Files — MinIO presign + complete

**Files:**
- Create: `apps/api/src/files/s3.service.ts`, `files.service.ts`, `files.controller.ts`
- Test: `apps/api/src/files/files.service.spec.ts` (mock S3 client)

**Interfaces:**
- Consumes: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, shared `presignFileSchema`
- Produces:
  - `POST /files/presign` → `{ fileId, uploadUrl, storageKey }` (chỉ image mime: jpeg/png/gif/webp/svg)
  - `POST /files/complete` → `{ id, url }` (head object verify size/mime)
  - `GET /files/:id` → short-lived GET presign nếu user đọc được document liên kết (hoặc uploader)

Allowlist:

```typescript
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']);
const MAX_BYTES = 10 * 1024 * 1024;
```

`storageKey = `workspaces/{workspaceId}/documents/{documentId}/{uuid}-{safeName}``

- [ ] **Step 1: Failing test — reject `application/pdf`**

- [ ] **Step 2: Implement + Pass**

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(api): MinIO presigned image upload"
```

---

### Task 11: Document ACL + private flag + audit read API

**Files:**
- Modify: documents controller/service — `PATCH` `isPrivate`, members endpoints
- Create: `GET /workspaces/:id/audit-logs` (Admin/Owner, pagination)
- Test: private visibility e2e

**Interfaces:**
- Produces:
  - `GET/PUT /documents/:id/members`
  - `PATCH /documents/:id` body `{ isPrivate?: boolean, title?: string }`
  - Editor chỉ đổi private/share nếu `created_by === user` hoặc role admin/owner
  - List documents trong workspace **lọc** private theo rule Task 5

- [ ] **Step 1: E2E — admin không thấy private doc của editor (trừ khi được share hoặc là owner workspace)**

- [ ] **Step 2: Implement + commit**

```bash
git commit -m "feat(api): document ACL, private docs, audit log API"
```

---

### Task 12: Frontend shell — layout, workspace, sidebar

**Files:**
- Create: `apps/web/src/lib/api.ts`
- Create: `apps/web/src/app/(app)/layout.tsx`
- Create: `apps/web/src/components/workspace-switcher.tsx`
- Create: `apps/web/src/components/sidebar-tree.tsx`
- Create: pages: workspaces list, workspace home, settings members
- Add: shadcn button, input, dropdown, dialog, badge

**Interfaces:**
- Consumes: API Task 6–7; `session.accessToken`
- Produces: UX điều hướng Workspace → Folder → Document list; tạo workspace/folder/doc

- [ ] **Step 1: `apiFetch` helper**

```typescript
export async function apiFetch<T>(path: string, accessToken: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.message ?? res.statusText), { code: body.code, status: res.status });
  }
  return res.json() as Promise<T>;
}
```

- [ ] **Step 2: Layout sidebar + pages cơ bản (chưa editor)**

- [ ] **Step 3: Manual verify + commit**

```bash
git commit -m "feat(web): app shell, workspace switcher, folder tree"
```

---

### Task 13: Tiptap editor + autosave + publish UI + versions panel

**Files:**
- Create: `apps/web/src/components/editor/wiki-editor.tsx`
- Create: `apps/web/src/components/editor/extensions.ts` (StarterKit, TaskList, Table, CodeBlockLowlight, Callout custom, Image, Mermaid node)
- Create: `apps/web/src/hooks/use-autosave.ts`
- Create: `apps/web/src/components/version-panel.tsx`
- Create: `apps/web/src/app/(app)/w/[workspaceId]/d/[documentId]/page.tsx`
- Test: `apps/web/src/hooks/use-autosave.test.ts`

**Interfaces:**
- Consumes: `PATCH /documents/:id/content`, publish, versions, files presign
- Produces: editor Notion-like; badge Draft/Published; Publish button; version list/restore; image upload qua presign; Mermaid render client

- [ ] **Step 1: Autosave hook test**

```typescript
it('debounces save calls', async () => {
  vi.useFakeTimers();
  const save = vi.fn().mockResolvedValue(undefined);
  const { rerender } = renderHook(/* useAutosave(content, save, 1500) */);
  // change content twice quickly → only 1 save after 1500ms
});
```

- [ ] **Step 2: Implement editor page**

- Debounce 1500ms → PATCH content
- Indicator: `Saving…` / `Saved` / `Error`
- Publish → POST publish → refresh badge + versions
- Version panel → restore → reload editor content
- Image: file picker → presign → PUT MinIO → insert image node với `GET /files/:id` URL

- [ ] **Step 3: Mermaid node** — render bằng `mermaid` package trong React node view; source trong attrs

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(web): Tiptap editor, autosave, publish, versions, images"
```

---

### Task 14: Swagger, seed, README, smoke E2E

**Files:**
- Modify: `apps/api/src/main.ts` — Swagger at `/docs`
- Create: `apps/api/src/database/seed.ts` (optional demo workspace nếu user đã login một lần — hoặc document manual seed)
- Modify: `README.md` — chạy local từng bước
- Test: checklist thủ công theo success criteria spec §1

**Interfaces:**
- Produces: README hoàn chỉnh; OpenAPI; path smoke đã verify

- [ ] **Step 1: Swagger setup**

```typescript
const config = new DocumentBuilder()
  .setTitle('Web Note API')
  .setVersion('0.1')
  .addBearerAuth()
  .build();
SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));
```

- [ ] **Step 2: README**

Sections: Prerequisites (Docker, Node 20+, pnpm), `cp .env.example .env`, `docker compose up -d`, `pnpm install`, `pnpm db:migrate`, `pnpm dev`, Keycloak demo user, mở `http://localhost:3000`, link Swagger `http://localhost:3001/docs`.

- [ ] **Step 3: Manual success-criteria checklist**

Đánh dấu từng mục spec § Success criteria khi verify tay.

- [ ] **Step 4: Commit**

```bash
git commit -m "docs: README local setup, Swagger, MVP smoke checklist"
```

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| Monorepo + Compose (Postgres/Redis/Keycloak/MinIO) | 1 |
| Shared Zod/roles | 2 |
| DB schema + migrate | 3 |
| Keycloak SSO + /me | 4 |
| Permission Workspace+Document + private + Owner bypass | 5, 11 |
| Workspace/members | 6 |
| Folder/Document CRUD duplicate move soft-delete | 7 |
| Tiptap + autosave + draft/publish | 8, 13 |
| Version history + restore | 9, 13 |
| Image MinIO metadata-only PG | 10, 13 |
| Audit log | 5, 6, 8, 11 |
| Swagger + README | 14 |
| Không OpenSearch/WS/AI | Global Constraints — không có task |

**Quy tắc restore → draft** được chốt ở Task 9 (không còn mơ hồ).

**Placeholder scan:** không còn TBD trong steps; mime allowlist và MAX_BYTES đã số cụ thể.

---

## Execution handoff

Plan đã lưu tại `docs/superpowers/plans/2026-09-04-foundation-core-wiki.md`.

**Hai cách triển khai:**

1. **Subagent-Driven (khuyến nghị)** — mỗi task một subagent mới, review giữa các task  
2. **Inline Execution** — làm tuần tự trong session này với checkpoint  

Bạn chọn cách nào?
