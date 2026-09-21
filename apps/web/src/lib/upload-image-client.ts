import { uploadDocumentImageAction } from '@/lib/actions';

const ALLOWED = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
]);

export function isAllowedImageFile(file: File): boolean {
  return ALLOWED.has(file.type) || /\.(png|jpe?g|gif|webp)$/i.test(file.name);
}

export function fileFromClipboard(data: DataTransfer | null): File | null {
  if (!data) return null;

  for (const item of Array.from(data.items ?? [])) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file && isAllowedImageFile(file)) {
        return file;
      }
    }
  }

  for (const file of Array.from(data.files ?? [])) {
    if (isAllowedImageFile(file)) {
      return file;
    }
  }

  return null;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      resolve(dataUrl.split(',')[1] ?? '');
    };
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.readAsDataURL(file);
  });
}

export async function uploadImageFile(input: {
  file: File;
  workspaceId: string;
  documentId: string;
}): Promise<{ id: string; url: string }> {
  const bytesBase64 = await fileToBase64(input.file);
  const uploaded = await uploadDocumentImageAction({
    workspaceId: input.workspaceId,
    documentId: input.documentId,
    filename: input.file.name || `paste-${Date.now()}.png`,
    mimeType: input.file.type || 'image/png',
    sizeBytes: input.file.size,
    bytesBase64,
  });

  // Same-origin stable URL (cookie auth). Never store MinIO presign URLs.
  return {
    id: uploaded.id,
    url: `/api/files/${uploaded.id}`,
  };
}
