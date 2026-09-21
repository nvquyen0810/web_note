'use client';

import type { Editor } from '@tiptap/react';
import {
  Bold,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  ListTodo,
  MessageSquareWarning,
  Pilcrow,
  Quote,
  Redo2,
  Strikethrough,
  Table,
  Underline as UnderlineIcon,
  Undo2,
  Workflow,
} from 'lucide-react';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { uploadImageFile } from '@/lib/upload-image-client';
import { cn } from '@/lib/utils';
import { insertWikiImage } from './wiki-image';

type EditorToolbarProps = {
  editor: Editor;
  workspaceId: string;
  documentId: string;
};

function ToolButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      title={title}
      className={cn('h-8 w-8', active && 'bg-accent text-accent-foreground')}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

export function EditorToolbar({
  editor,
  workspaceId,
  documentId,
}: EditorToolbarProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleImageSelected(file: File | undefined) {
    if (!file) return;
    const { url, id } = await uploadImageFile({
      file,
      workspaceId,
      documentId,
    });
    insertWikiImage(editor, {
      src: url,
      alt: file.name,
      fileId: id,
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-card/80 px-2 py-1.5">
      <ToolButton
        title="Undo"
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo2 className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        title="Redo"
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo2 className="h-4 w-4" />
      </ToolButton>

      <span className="mx-1 h-5 w-px bg-border" />

      <ToolButton
        title="Paragraph"
        active={editor.isActive('paragraph')}
        onClick={() => editor.chain().focus().setParagraph().run()}
      >
        <Pilcrow className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        title="Heading 1"
        active={editor.isActive('heading', { level: 1 })}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 1 }).run()
        }
      >
        <Heading1 className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        title="Heading 2"
        active={editor.isActive('heading', { level: 2 })}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
      >
        <Heading2 className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        title="Heading 3"
        active={editor.isActive('heading', { level: 3 })}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 3 }).run()
        }
      >
        <Heading3 className="h-4 w-4" />
      </ToolButton>

      <span className="mx-1 h-5 w-px bg-border" />

      <ToolButton
        title="Bold"
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        title="Italic"
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        title="Underline"
        active={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        title="Strike"
        active={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        title="Link"
        active={editor.isActive('link')}
        onClick={() => {
          const previous = editor.getAttributes('link').href as
            | string
            | undefined;
          const url = window.prompt('URL', previous ?? 'https://');
          if (url === null) return;
          if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
          }
          editor
            .chain()
            .focus()
            .extendMarkRange('link')
            .setLink({ href: url })
            .run();
        }}
      >
        <Link2 className="h-4 w-4" />
      </ToolButton>

      <span className="mx-1 h-5 w-px bg-border" />

      <ToolButton
        title="Bullet list"
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        title="Ordered list"
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        title="Task list"
        active={editor.isActive('taskList')}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
      >
        <ListTodo className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        title="Blockquote"
        active={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        title="Table"
        onClick={() =>
          editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run()
        }
      >
        <Table className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        title="Code block"
        active={editor.isActive('codeBlock')}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        <Code2 className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        title="Callout"
        onClick={() => editor.chain().focus().setCallout({ type: 'info' }).run()}
      >
        <MessageSquareWarning className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        title="Mermaid diagram"
        onClick={() => editor.chain().focus().setMermaid().run()}
      >
        <Workflow className="h-4 w-4" />
      </ToolButton>
      <ToolButton title="Image" onClick={() => fileRef.current?.click()}>
        <ImageIcon className="h-4 w-4" />
      </ToolButton>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          void handleImageSelected(file).finally(() => {
            event.target.value = '';
          });
        }}
      />
    </div>
  );
}
