import Link from 'next/link';
import { APP_NAME } from '@web-note/shared';
import { auth, signOut } from '@/auth';
import { CreateWorkspaceDialog } from '@/components/create-workspace-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import type { WorkspaceSummary } from '@/lib/types';

export default async function WorkspacesPage() {
  const session = await auth();
  const workspaces = await apiFetch<WorkspaceSummary[]>(
    '/workspaces',
    session!.accessToken!,
  );

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/workspaces"
            className="font-display text-lg font-semibold tracking-tight"
          >
            {APP_NAME}
          </Link>
          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/' });
            }}
          >
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              Workspaces
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose a space or create a new one.
            </p>
          </div>
          <CreateWorkspaceDialog />
        </div>

        {workspaces.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card/60 px-6 py-16 text-center">
            <p className="font-display text-xl">No workspaces yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Create your first workspace to start writing.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border bg-card/70">
            {workspaces.map((workspace) => (
              <li key={workspace.id}>
                <Link
                  href={`/w/${workspace.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-accent/50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{workspace.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      Updated{' '}
                      {new Date(workspace.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="secondary">{workspace.role}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
