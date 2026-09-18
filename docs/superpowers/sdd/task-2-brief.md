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
- Consumes: none
- Produces:
  - `WorkspaceRole = 'owner' | 'admin' | 'editor' | 'viewer'`
  - `roleAtLeast(role, minimum): boolean`
  - `canManageMembers(role): boolean`
  - `canEditContent(role): boolean`
  - `ApiErrorBody = { code: string; message: string; details?: unknown }`
  - Zod: `createWorkspaceSchema`, `createFolderSchema`, `createDocumentSchema`, `updateDocumentContentSchema`, `presignFileSchema`

## Resolved schema constraints (controller decisions — use verbatim)

```typescript
// workspace.ts
export const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(200),
});
export const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(200),
});

// folder.ts
export const createFolderSchema = z.object({
  name: z.string().min(1).max(200),
  parentId: z.string().uuid().nullable().optional(),
});
export const updateFolderSchema = z.object({
  name: z.string().min(1).max(200).optional(),
});
export const moveFolderSchema = z.object({
  parentId: z.string().uuid().nullable(),
});

// document.ts — as in plan:
export const documentStatusSchema = z.enum(['draft', 'published']);
export const createDocumentSchema = z.object({
  title: z.string().min(1).max(500),
  folderId: z.string().uuid().nullable().optional(),
});
export const updateDocumentContentSchema = z.object({
  content: z.record(z.string(), z.unknown()),
  title: z.string().min(1).max(500).optional(),
});

// file.ts
export const presignFileSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(127),
  sizeBytes: z.number().int().positive().max(10 * 1024 * 1024),
  documentId: z.string().uuid().optional(),
  workspaceId: z.string().uuid(),
});
export const completeFileSchema = z.object({
  fileId: z.string().uuid(),
});
```

```typescript
// errors.ts
export type ApiErrorBody = {
  code: string;
  message: string;
  details?: unknown;
};
```

Roles implementation and roles.test.ts: use exact code from plan Task 2 steps 1–3.

- [ ] Step 1: Write failing roles.test.ts
- [ ] Step 2: Run `pnpm --filter @web-note/shared test` — expect FAIL
- [ ] Step 3: Implement roles + schemas + export from index.ts (keep APP_NAME)
- [ ] Step 4: Tests PASS + commit `feat(shared): roles, errors, zod schemas`
