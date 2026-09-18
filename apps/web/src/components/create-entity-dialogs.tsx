'use client';

import { useState } from 'react';
import { FolderPlus, FilePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  createDocumentAction,
  createFolderAction,
} from '@/lib/actions';

type CreateEntityDialogsProps = {
  workspaceId: string;
};

export function CreateEntityDialogs({ workspaceId }: CreateEntityDialogsProps) {
  const [folderOpen, setFolderOpen] = useState(false);
  const [docOpen, setDocOpen] = useState(false);

  return (
    <div className="flex gap-1">
      <Dialog open={folderOpen} onOpenChange={setFolderOpen}>
        <DialogTrigger asChild>
          <Button variant="sidebar" size="icon" title="New folder">
            <FolderPlus className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <form
            action={async (formData) => {
              await createFolderAction(workspaceId, formData);
              setFolderOpen(false);
            }}
            className="space-y-4"
          >
            <DialogHeader>
              <DialogTitle>New folder</DialogTitle>
              <DialogDescription>
                Create a folder at the workspace root.
              </DialogDescription>
            </DialogHeader>
            <Input name="name" placeholder="Folder name" required autoFocus />
            <DialogFooter>
              <Button type="submit">Create folder</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={docOpen} onOpenChange={setDocOpen}>
        <DialogTrigger asChild>
          <Button variant="sidebar" size="icon" title="New document">
            <FilePlus className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <form
            action={async (formData) => {
              await createDocumentAction(workspaceId, formData);
              setDocOpen(false);
            }}
            className="space-y-4"
          >
            <DialogHeader>
              <DialogTitle>New document</DialogTitle>
              <DialogDescription>
                Starts as a draft at the workspace root.
              </DialogDescription>
            </DialogHeader>
            <Input name="title" placeholder="Document title" required autoFocus />
            <DialogFooter>
              <Button type="submit">Create document</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
