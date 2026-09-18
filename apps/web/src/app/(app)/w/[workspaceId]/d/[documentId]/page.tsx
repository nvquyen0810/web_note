import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { DocumentEditor } from '@/components/document-editor';
import type { WikiDocJson } from '@/components/editor/wiki-editor';
import type { VersionRow } from '@/components/version-panel';
import { ApiError, apiFetch } from '@/lib/api';
import type { DocumentRow } from '@/lib/types';

type DocumentPageProps = {
  params: Promise<{ workspaceId: string; documentId: string }>;
};

type DocumentDetail = DocumentRow & {
  content: WikiDocJson;
};

export default async function DocumentPage({ params }: DocumentPageProps) {
  const { workspaceId, documentId } = await params;
  const session = await auth();
  const accessToken = session!.accessToken!;

  let document: DocumentDetail;
  let versions: VersionRow[];

  try {
    [document, versions] = await Promise.all([
      apiFetch<DocumentDetail>(`/documents/${documentId}`, accessToken),
      apiFetch<VersionRow[]>(`/documents/${documentId}/versions`, accessToken),
    ]);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
      notFound();
    }
    throw error;
  }

  return (
    <DocumentEditor
      workspaceId={workspaceId}
      documentId={documentId}
      accessToken={accessToken}
      initialDocument={document}
      initialVersions={versions}
    />
  );
}
