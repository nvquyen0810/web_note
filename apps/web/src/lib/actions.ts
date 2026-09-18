'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { WikiDocJson } from '@/components/editor/wiki-editor';
import type { VersionRow } from '@/components/version-panel';
import { apiFetch } from '@/lib/api';
import { requireAccessToken } from '@/lib/session';
import type { DocumentRow, FolderRow, WorkspaceSummary } from '@/lib/types';

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

export async function saveDocumentContentAction(
  documentId: string,
  input: { title: string; content: WikiDocJson },
) {
  const token = await requireAccessToken();
  return apiFetch(`/documents/${documentId}/content`, token, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function publishDocumentAction(documentId: string) {
  const token = await requireAccessToken();
  await apiFetch(`/documents/${documentId}/publish`, token, {
    method: 'POST',
  });

  const [document, versions] = await Promise.all([
    apiFetch<DocumentRow & { content: WikiDocJson }>(
      `/documents/${documentId}`,
      token,
    ),
    apiFetch<VersionRow[]>(`/documents/${documentId}/versions`, token),
  ]);

  return { document, versions };
}

export async function restoreDocumentVersionAction(
  documentId: string,
  version: number,
) {
  const token = await requireAccessToken();
  await apiFetch(
    `/documents/${documentId}/versions/${version}/restore`,
    token,
    { method: 'POST' },
  );

  const [document, versions] = await Promise.all([
    apiFetch<DocumentRow & { content: WikiDocJson }>(
      `/documents/${documentId}`,
      token,
    ),
    apiFetch<VersionRow[]>(`/documents/${documentId}/versions`, token),
  ]);

  return { document, versions };
}

export async function uploadDocumentImageAction(input: {
  workspaceId: string;
  documentId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  bytesBase64: string;
}) {
  const token = await requireAccessToken();

  const presign = await apiFetch<{
    fileId: string;
    uploadUrl: string;
  }>('/files/presign', token, {
    method: 'POST',
    body: JSON.stringify({
      filename: input.filename,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      workspaceId: input.workspaceId,
      documentId: input.documentId,
    }),
  });

  const binary = Buffer.from(input.bytesBase64, 'base64');
  const put = await fetch(presign.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': input.mimeType },
    body: binary,
  });

  if (!put.ok) {
    throw new Error(`Upload failed (${put.status})`);
  }

  return apiFetch<{ id: string; url: string }>('/files/complete', token, {
    method: 'POST',
    body: JSON.stringify({ fileId: presign.fileId }),
  });
}
