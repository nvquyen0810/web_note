import { Badge } from '@/components/ui/badge';
import { apiFetch } from '@/lib/api';
import { redirectIfUnauthorized, requireAccessToken } from '@/lib/session';
import type { WorkspaceRole } from '@web-note/shared';

type MemberRow = {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  createdAt: string;
};

type MembersPageProps = {
  params: Promise<{ workspaceId: string }>;
};

export default async function WorkspaceMembersPage({
  params,
}: MembersPageProps) {
  const { workspaceId } = await params;
  const token = await requireAccessToken();

  let members: MemberRow[];
  try {
    members = await apiFetch<MemberRow[]>(
      `/workspaces/${workspaceId}/members`,
      token,
    );
  } catch (error) {
    await redirectIfUnauthorized(error);
    throw error;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-10 sm:px-10">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Members
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Who can access this workspace. Invite/edit flows land in a later pass.
        </p>
      </div>

      <ul className="divide-y divide-border rounded-lg border border-border bg-card/70">
        {members.map((member) => (
          <li
            key={member.id}
            className="flex items-center justify-between gap-3 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate font-mono text-sm">{member.userId}</p>
              <p className="text-xs text-muted-foreground">
                Joined {new Date(member.createdAt).toLocaleDateString()}
              </p>
            </div>
            <Badge variant="secondary">{member.role}</Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}
