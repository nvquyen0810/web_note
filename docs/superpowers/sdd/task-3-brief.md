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

