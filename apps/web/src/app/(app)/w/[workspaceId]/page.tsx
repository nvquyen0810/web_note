import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { apiFetch } from '@/lib/api';
import { redirectIfUnauthorized, requireAccessToken } from '@/lib/session';
import type { DocumentRow, WorkspaceSummary } from '@/lib/types';

type WorkspaceHomeProps = {
  params: Promise<{ workspaceId: string }>;
};

export default async function WorkspaceHomePage({ params }: WorkspaceHomeProps) {
  const { workspaceId } = await params;
  const token = await requireAccessToken();

  let workspaces: WorkspaceSummary[];
  let documents: DocumentRow[];
  try {
    [workspaces, documents] = await Promise.all([
      apiFetch<WorkspaceSummary[]>('/workspaces', token),
      apiFetch<DocumentRow[]>(`/workspaces/${workspaceId}/documents`, token),
    ]);
  } catch (error) {
    await redirectIfUnauthorized(error);
    throw error;
  }

  const workspace = workspaces.find((item) => item.id === workspaceId);
  const recent = documents
    .slice()
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, 12);

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-6 py-10 sm:px-10">
      <div>
        <p className="text-sm text-muted-foreground">Workspace</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {workspace?.name ?? 'Workspace'}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Open a document from the sidebar, or create a new one.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Recent documents
        </h2>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing here yet. Use the + icons in the sidebar.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border bg-card/70">
            {recent.map((document) => (
              <li key={document.id}>
                <Link
                  href={`/w/${workspaceId}/d/${document.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-accent/40"
                >
                  <span className="truncate font-medium">{document.title}</span>
                  <Badge
                    variant={
                      document.status === 'published' ? 'published' : 'draft'
                    }
                  >
                    {document.status}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
