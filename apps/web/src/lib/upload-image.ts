import { apiFetch } from '@/lib/api';

type UploadArgs = {
  file: File;
  accessToken: string;
  workspaceId: string;
  documentId: string;
};

type PresignResponse = {
  fileId: string;
  uploadUrl: string;
  storageKey: string;
};

type CompleteResponse = {
  id: string;
  url: string;
};

export async function uploadDocumentImage({
  file,
  accessToken,
  workspaceId,
  documentId,
}: UploadArgs): Promise<{ id: string; url: string }> {
  const presign = await apiFetch<PresignResponse>('/files/presign', accessToken, {
    method: 'POST',
    body: JSON.stringify({
      filename: file.name,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
      workspaceId,
      documentId,
    }),
  });

  const put = await fetch(presign.uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
    },
    body: file,
  });

  if (!put.ok) {
    throw new Error(`Upload failed (${put.status})`);
  }

  const completed = await apiFetch<CompleteResponse>(
    '/files/complete',
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({ fileId: presign.fileId }),
    },
  );

  return completed;
}
