'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';
import { WikiEditor, type WikiDocJson } from '@/components/editor/wiki-editor';
import { VersionPanel, type VersionRow } from '@/components/version-panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAutosave } from '@/hooks/use-autosave';
import { apiFetch } from '@/lib/api';
import type { DocumentRow } from '@/lib/types';

type DocumentDetail = DocumentRow & {
  content: WikiDocJson;
};

type DocumentEditorProps = {
  workspaceId: string;
  documentId: string;
  accessToken: string;
  initialDocument: DocumentDetail;
  initialVersions: VersionRow[];
};

type SavePayload = {
  title: string;
  content: WikiDocJson;
};

function statusLabel(status: AutosaveUiStatus) {
  switch (status) {
    case 'pending':
      return 'Pending…';
    case 'saving':
      return 'Saving…';
    case 'saved':
      return 'Saved';
    case 'error':
      return 'Error saving';
    default:
      return '';
  }
}

type AutosaveUiStatus = ReturnType<typeof useAutosave<SavePayload>>['status'];

export function DocumentEditor({
  workspaceId,
  documentId,
  accessToken,
  initialDocument,
  initialVersions,
}: DocumentEditorProps) {
  const [title, setTitle] = useState(initialDocument.title);
  const [content, setContent] = useState<WikiDocJson>(
    initialDocument.content ?? { type: 'doc', content: [] },
  );
  const [docStatus, setDocStatus] = useState(initialDocument.status);
  const [versions, setVersions] = useState(initialVersions);
  const [contentRevision, setContentRevision] = useState(0);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [isPublishing, startPublish] = useTransition();

  const payload = useMemo<SavePayload>(
    () => ({ title, content }),
    [title, content],
  );

  const save = useCallback(
    async (value: SavePayload) => {
      await apiFetch(`/documents/${documentId}/content`, accessToken, {
        method: 'PATCH',
        body: JSON.stringify({
          title: value.title,
          content: value.content,
        }),
      });
    },
    [accessToken, documentId],
  );

  const { status: autosaveStatus } = useAutosave(payload, save, {
    delayMs: 1500,
  });

  async function refreshAfterRestore() {
    const [document, nextVersions] = await Promise.all([
      apiFetch<DocumentDetail>(`/documents/${documentId}`, accessToken),
      apiFetch<VersionRow[]>(`/documents/${documentId}/versions`, accessToken),
    ]);
    setTitle(document.title);
    setContent(document.content ?? { type: 'doc', content: [] });
    setDocStatus(document.status);
    setVersions(nextVersions);
    setContentRevision((value) => value + 1);
  }

  function publish() {
    setPublishError(null);
    startPublish(async () => {
      try {
        await apiFetch(`/documents/${documentId}/publish`, accessToken, {
          method: 'POST',
        });
        const [document, nextVersions] = await Promise.all([
          apiFetch<DocumentDetail>(`/documents/${documentId}`, accessToken),
          apiFetch<VersionRow[]>(
            `/documents/${documentId}/versions`,
            accessToken,
          ),
        ]);
        setDocStatus(document.status);
        setVersions(nextVersions);
      } catch (err) {
        setPublishError(err instanceof Error ? err.message : 'Publish failed');
      }
    });
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6 sm:px-8 lg:flex-row lg:items-start">
      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="h-auto border-0 bg-transparent px-0 font-display text-3xl font-semibold shadow-none focus-visible:ring-0"
              aria-label="Document title"
            />
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge
                variant={docStatus === 'published' ? 'published' : 'draft'}
              >
                {docStatus}
              </Badge>
              <span>{statusLabel(autosaveStatus)}</span>
            </div>
          </div>
          <Button
            type="button"
            onClick={publish}
            disabled={isPublishing || autosaveStatus === 'saving'}
          >
            {isPublishing ? 'Publishing…' : 'Publish'}
          </Button>
        </div>

        {publishError ? (
          <p className="text-sm text-destructive">{publishError}</p>
        ) : null}

        <WikiEditor
          content={content}
          contentRevision={contentRevision}
          accessToken={accessToken}
          workspaceId={workspaceId}
          documentId={documentId}
          onChange={setContent}
        />
      </div>

      <div className="w-full shrink-0 lg:w-72">
        <VersionPanel
          documentId={documentId}
          accessToken={accessToken}
          versions={versions}
          onRestored={refreshAfterRestore}
        />
      </div>
    </div>
  );
}
