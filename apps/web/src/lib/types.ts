import type { WorkspaceRole } from '@web-note/shared';

export type WorkspaceSummary = {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  role: WorkspaceRole;
};

export type FolderRow = {
  id: string;
  workspaceId: string;
  parentId: string | null;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type DocumentRow = {
  id: string;
  workspaceId: string;
  folderId: string | null;
  title: string;
  createdBy: string;
  status: 'draft' | 'published';
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceMember = {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  createdAt: string;
};
