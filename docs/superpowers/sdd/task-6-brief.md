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

