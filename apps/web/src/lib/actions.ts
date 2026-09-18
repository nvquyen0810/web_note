'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { apiFetch } from '@/lib/api';
import type {
  DocumentRow,
  FolderRow,
  WorkspaceSummary,
} from '@/lib/types';

async function requireAccessToken() {
  const session = await auth();
  if (!session?.accessToken) {
    throw new Error('Unauthorized');
  }
  return session.accessToken;
}

export async function createWorkspaceAction(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  if (!name) {
    throw new Error('Workspace name is required');
  }

  const token = await requireAccessToken();
  const workspace = await apiFetch<WorkspaceSummary>('/workspaces', token, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });

  revalidatePath('/workspaces');
  redirect(`/w/${workspace.id}`);
}

export async function createFolderAction(
  workspaceId: string,
  formData: FormData,
) {
  const name = String(formData.get('name') ?? '').trim();
  const parentIdRaw = formData.get('parentId');
  const parentId =
    typeof parentIdRaw === 'string' && parentIdRaw.length > 0
      ? parentIdRaw
      : null;

  if (!name) {
    throw new Error('Folder name is required');
  }

  const token = await requireAccessToken();
  await apiFetch<FolderRow>(`/workspaces/${workspaceId}/folders`, token, {
    method: 'POST',
    body: JSON.stringify({ name, parentId }),
  });

  revalidatePath(`/w/${workspaceId}`);
}

export async function createDocumentAction(
  workspaceId: string,
  formData: FormData,
) {
  const title = String(formData.get('title') ?? '').trim();
  const folderIdRaw = formData.get('folderId');
  const folderId =
    typeof folderIdRaw === 'string' && folderIdRaw.length > 0
      ? folderIdRaw
      : null;

  if (!title) {
    throw new Error('Document title is required');
  }

  const token = await requireAccessToken();
  const document = await apiFetch<DocumentRow>(
    `/workspaces/${workspaceId}/documents`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({ title, folderId }),
    },
  );

  revalidatePath(`/w/${workspaceId}`);
  redirect(`/w/${workspaceId}/d/${document.id}`);
}
