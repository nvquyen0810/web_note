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

