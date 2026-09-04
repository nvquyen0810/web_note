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
