'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';

export type VersionRow = {
  version: number;
  title: string;
  createdAt: string;
  createdBy: string;
  restoredFromVersion: number | null;
};

type VersionPanelProps = {
  documentId: string;
  accessToken: string;
  versions: VersionRow[];
  onRestored: () => Promise<void> | void;
};

export function VersionPanel({
  documentId,
  accessToken,
  versions,
  onRestored,
}: VersionPanelProps) {
  const [pendingVersion, setPendingVersion] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function restore(version: number) {
    setError(null);
    setPendingVersion(version);
    startTransition(async () => {
      try {
        await apiFetch(
          `/documents/${documentId}/versions/${version}/restore`,
          accessToken,
          { method: 'POST' },
        );
        await onRestored();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Restore failed');
      } finally {
        setPendingVersion(null);
      }
    });
  }

  return (
    <aside className="space-y-3 rounded-lg border border-border bg-card/70 p-4">
      <div>
        <h2 className="font-display text-lg font-semibold">Versions</h2>
        <p className="text-xs text-muted-foreground">
          Snapshots from publish and restore.
        </p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {versions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No versions yet.</p>
      ) : (
        <ul className="space-y-2">
          {versions.map((version) => (
            <li
              key={version.version}
              className="rounded-md border border-border/80 px-3 py-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    v{version.version}
                    {version.restoredFromVersion != null
                      ? ` · from v${version.restoredFromVersion}`
                      : ''}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {version.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(version.createdAt).toLocaleString()}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => restore(version.version)}
                >
                  {pendingVersion === version.version ? '…' : 'Restore'}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
