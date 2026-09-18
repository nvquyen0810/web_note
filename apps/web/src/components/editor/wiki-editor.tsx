'use client';

import { EditorContent, useEditor } from '@tiptap/react';
import { useEffect } from 'react';
import { EditorToolbar } from './editor-toolbar';
import { createWikiExtensions } from './extensions';

export type WikiDocJson = Record<string, unknown>;

const EMPTY_DOC: WikiDocJson = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

type WikiEditorProps = {
  content: WikiDocJson;
  editable?: boolean;
  accessToken: string;
  workspaceId: string;
  documentId: string;
  onChange: (content: WikiDocJson) => void;
  contentRevision?: number;
};

export function WikiEditor({
  content,
  editable = true,
  accessToken,
  workspaceId,
  documentId,
  onChange,
  contentRevision = 0,
}: WikiEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: createWikiExtensions(),
    content: content ?? EMPTY_DOC,
    editable,
    editorProps: {
      attributes: {
        class:
          'wiki-editor prose prose-neutral max-w-none min-h-[28rem] px-6 py-5 focus:outline-none',
      },
    },
    onUpdate: ({ editor: current }) => {
      onChange(current.getJSON() as WikiDocJson);
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable);
  }, [editor, editable]);

  useEffect(() => {
    if (!editor || contentRevision === 0) return;
    editor.commands.setContent(content ?? EMPTY_DOC, { emitUpdate: false });
  }, [contentRevision, editor]);

  if (!editor) {
    return (
      <div className="min-h-[28rem] rounded-lg border border-border bg-card/50 px-6 py-5 text-sm text-muted-foreground">
        Loading editor…
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card/80 shadow-sm">
      {editable ? (
        <EditorToolbar
          editor={editor}
          accessToken={accessToken}
          workspaceId={workspaceId}
          documentId={documentId}
        />
      ) : null}
      <EditorContent editor={editor} />
    </div>
  );
}
