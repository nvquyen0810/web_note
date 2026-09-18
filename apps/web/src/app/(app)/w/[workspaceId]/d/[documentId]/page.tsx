import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ApiError, apiFetch } from '@/lib/api';
import type { DocumentRow } from '@/lib/types';

type DocumentPageProps = {
  params: Promise<{ workspaceId: string; documentId: string }>;
};

export default async function DocumentPlaceholderPage({
  params,
}: DocumentPageProps) {
  const { workspaceId, documentId } = await params;
  const session = await auth();

  let document: DocumentRow & { content?: unknown };
  try {
    document = await apiFetch(
      `/documents/${documentId}`,
      session!.accessToken!,
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-10 sm:px-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link
              href={`/w/${workspaceId}`}
              className="hover:text-foreground"
            >
              Workspace
            </Link>
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {document.title}
          </h1>
        </div>
        <Badge
          variant={document.status === 'published' ? 'published' : 'draft'}
        >
          {document.status}
        </Badge>
      </div>

      <div className="rounded-lg border border-dashed border-border bg-card/50 px-6 py-12 text-center">
        <p className="font-display text-xl">Editor coming next</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Task 13 will add the Tiptap editor, autosave, publish, and versions.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link href={`/w/${workspaceId}`}>Back to workspace</Link>
        </Button>
      </div>
    </div>
  );
}
