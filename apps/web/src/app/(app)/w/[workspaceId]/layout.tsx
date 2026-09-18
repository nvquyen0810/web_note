import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { APP_NAME } from '@web-note/shared';
import { Settings } from 'lucide-react';
import { auth, signOut } from '@/auth';
import { CreateEntityDialogs } from '@/components/create-entity-dialogs';
import { SidebarTree } from '@/components/sidebar-tree';
import { Button } from '@/components/ui/button';
import { WorkspaceSwitcher } from '@/components/workspace-switcher';
import { ApiError, apiFetch } from '@/lib/api';
import type {
  DocumentRow,
  FolderRow,
  WorkspaceSummary,
} from '@/lib/types';

type WorkspaceLayoutProps = {
  children: ReactNode;
  params: Promise<{ workspaceId: string }>;
};

export default async function WorkspaceLayout({
  children,
  params,
}: WorkspaceLayoutProps) {
  const { workspaceId } = await params;
  const session = await auth();
  if (!session?.accessToken) {
    redirect('/');
  }

  const token = session.accessToken;

  let workspaces: WorkspaceSummary[];
  let folders: FolderRow[];
  let documents: DocumentRow[];

  try {
    [workspaces, folders, documents] = await Promise.all([
      apiFetch<WorkspaceSummary[]>('/workspaces', token),
      apiFetch<FolderRow[]>(`/workspaces/${workspaceId}/folders`, token),
      apiFetch<DocumentRow[]>(`/workspaces/${workspaceId}/documents`, token),
    ]);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
      notFound();
    }
    throw error;
  }

  const workspace = workspaces.find((item) => item.id === workspaceId);
  if (!workspace) {
    notFound();
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-72 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="border-b border-sidebar-border px-3 py-3">
          <Link
            href="/workspaces"
            className="mb-3 block font-display text-sm font-semibold tracking-wide text-sidebar-foreground/90"
          >
            {APP_NAME}
          </Link>
          <WorkspaceSwitcher
            workspaces={workspaces}
            currentId={workspace.id}
          />
          <div className="mt-3 flex items-center justify-between gap-2">
            <CreateEntityDialogs workspaceId={workspaceId} />
            <Button variant="sidebar" size="icon" asChild title="Members">
              <Link href={`/w/${workspaceId}/settings/members`}>
                <Settings className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <SidebarTree
            workspaceId={workspaceId}
            folders={folders}
            documents={documents}
          />
        </div>
        <div className="border-t border-sidebar-border p-3">
          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/' });
            }}
          >
            <Button type="submit" variant="sidebar" size="sm" className="w-full">
              Sign out
            </Button>
          </form>
        </div>
      </aside>
      <div className="min-w-0 flex-1 overflow-auto">{children}</div>
    </div>
  );
}
