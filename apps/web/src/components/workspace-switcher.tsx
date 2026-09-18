'use client';

import Link from 'next/link';
import { Check, ChevronsUpDown, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { WorkspaceSummary } from '@/lib/types';
import { cn } from '@/lib/utils';

type WorkspaceSwitcherProps = {
  workspaces: WorkspaceSummary[];
  currentId?: string;
};

export function WorkspaceSwitcher({
  workspaces,
  currentId,
}: WorkspaceSwitcherProps) {
  const current = workspaces.find((w) => w.id === currentId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="sidebar"
          className="h-auto w-full justify-between px-2 py-2 text-left"
        >
          <span className="min-w-0">
            <span className="block truncate font-medium">
              {current?.name ?? 'Select workspace'}
            </span>
            {current ? (
              <span className="block truncate text-xs text-sidebar-foreground/60">
                {current.role}
              </span>
            ) : null}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="start">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        {workspaces.map((workspace) => (
          <DropdownMenuItem key={workspace.id} asChild>
            <Link
              href={`/w/${workspace.id}`}
              className={cn(
                'flex w-full items-center justify-between gap-2',
                workspace.id === currentId && 'bg-accent',
              )}
            >
              <span className="truncate">{workspace.name}</span>
              {workspace.id === currentId ? (
                <Check className="h-4 w-4 shrink-0" />
              ) : null}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/workspaces" className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            All workspaces
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
