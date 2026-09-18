'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  Lock,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { DocumentRow, FolderRow } from '@/lib/types';
import { cn } from '@/lib/utils';

type SidebarTreeProps = {
  workspaceId: string;
  folders: FolderRow[];
  documents: DocumentRow[];
};

type FolderNode = FolderRow & { children: FolderNode[] };

function buildFolderTree(folders: FolderRow[]): FolderNode[] {
  const byParent = new Map<string | null, FolderRow[]>();
  for (const folder of folders) {
    const key = folder.parentId;
    const list = byParent.get(key) ?? [];
    list.push(folder);
    byParent.set(key, list);
  }

  const walk = (parentId: string | null): FolderNode[] =>
    (byParent.get(parentId) ?? [])
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((folder) => ({
        ...folder,
        children: walk(folder.id),
      }));

  return walk(null);
}

function documentsInFolder(
  documents: DocumentRow[],
  folderId: string | null,
) {
  return documents
    .filter((doc) => doc.folderId === folderId)
    .slice()
    .sort((a, b) => a.title.localeCompare(b.title));
}

function DocumentLink({
  workspaceId,
  document,
  active,
}: {
  workspaceId: string;
  document: DocumentRow;
  active: boolean;
}) {
  return (
    <Link
      href={`/w/${workspaceId}/d/${document.id}`}
      className={cn(
        'group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground/80 transition-colors hover:bg-white/10 hover:text-sidebar-foreground',
        active && 'bg-white/15 text-sidebar-foreground',
      )}
    >
      <FileText className="h-3.5 w-3.5 shrink-0 opacity-70" />
      <span className="min-w-0 flex-1 truncate">{document.title}</span>
      {document.isPrivate ? (
        <Lock className="h-3 w-3 shrink-0 opacity-50" />
      ) : null}
      <Badge
        variant={document.status === 'published' ? 'published' : 'draft'}
        className="hidden scale-90 group-hover:inline-flex"
      >
        {document.status}
      </Badge>
    </Link>
  );
}

function FolderBranch({
  workspaceId,
  node,
  documents,
  activeDocumentId,
  depth,
}: {
  workspaceId: string;
  node: FolderNode;
  documents: DocumentRow[];
  activeDocumentId: string | null;
  depth: number;
}) {
  const [open, setOpen] = useState(true);
  const docs = documentsInFolder(documents, node.id);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-left text-sm text-sidebar-foreground/90 transition-colors hover:bg-white/10"
        style={{ paddingLeft: `${0.5 + depth * 0.75}rem` }}
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
        )}
        {open ? (
          <FolderOpen className="h-3.5 w-3.5 shrink-0 opacity-70" />
        ) : (
          <Folder className="h-3.5 w-3.5 shrink-0 opacity-70" />
        )}
        <span className="truncate">{node.name}</span>
      </button>
      {open ? (
        <div className="space-y-0.5">
          {node.children.map((child) => (
            <FolderBranch
              key={child.id}
              workspaceId={workspaceId}
              node={child}
              documents={documents}
              activeDocumentId={activeDocumentId}
              depth={depth + 1}
            />
          ))}
          <div
            className="space-y-0.5"
            style={{ paddingLeft: `${0.75 + depth * 0.75}rem` }}
          >
            {docs.map((document) => (
              <DocumentLink
                key={document.id}
                workspaceId={workspaceId}
                document={document}
                active={document.id === activeDocumentId}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function SidebarTree({
  workspaceId,
  folders,
  documents,
}: SidebarTreeProps) {
  const pathname = usePathname();
  const activeDocumentId = useMemo(() => {
    const match = pathname.match(/\/d\/([^/]+)/);
    return match?.[1] ?? null;
  }, [pathname]);

  const tree = useMemo(() => buildFolderTree(folders), [folders]);
  const rootDocs = useMemo(
    () => documentsInFolder(documents, null),
    [documents],
  );

  if (folders.length === 0 && documents.length === 0) {
    return (
      <p className="px-2 py-3 text-xs text-sidebar-foreground/55">
        No folders or documents yet.
      </p>
    );
  }

  return (
    <nav className="space-y-0.5" aria-label="Workspace tree">
      {tree.map((node) => (
        <FolderBranch
          key={node.id}
          workspaceId={workspaceId}
          node={node}
          documents={documents}
          activeDocumentId={activeDocumentId}
          depth={0}
        />
      ))}
      {rootDocs.map((document) => (
        <DocumentLink
          key={document.id}
          workspaceId={workspaceId}
          document={document}
          active={document.id === activeDocumentId}
        />
      ))}
    </nav>
  );
}
