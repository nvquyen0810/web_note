'use client';

import type { Editor } from '@tiptap/react';
import { EditorContent, useEditor } from '@tiptap/react';
import { useEffect, useRef } from 'react';
import { fileFromClipboard, uploadImageFile } from '@/lib/upload-image-client';
import { EditorToolbar } from './editor-toolbar';
import { createWikiExtensions } from './extensions';
import { insertWikiImage } from './wiki-image';

export type WikiDocJson = Record<string, unknown>;

const EMPTY_DOC: WikiDocJson = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

type WikiEditorProps = {
  content: WikiDocJson;
  editable?: boolean;
  workspaceId: string;
  documentId: string;
  onChange: (content: WikiDocJson) => void;
  contentRevision?: number;
};

export function WikiEditor({
  content,
  editable = true,
  workspaceId,
  documentId,
  onChange,
  contentRevision = 0,
}: WikiEditorProps) {
  const metaRef = useRef({ workspaceId, documentId });
  metaRef.current = { workspaceId, documentId };
  const editorRef = useRef<Editor | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  async function insertClipboardImage(file: File) {
    const editor = editorRef.current;
    if (!editor) return;
    const uploaded = await uploadImageFile({
      file,
      workspaceId: metaRef.current.workspaceId,
      documentId: metaRef.current.documentId,
    });
    insertWikiImage(editor, {
      src: uploaded.url,
      alt: file.name || 'pasted image',
      fileId: uploaded.id,
    });
    onChangeRef.current(editor.getJSON() as WikiDocJson);
  }

  const editor = useEditor({
    immediatelyRender: false,
    extensions: createWikiExtensions(),
    content: content ?? EMPTY_DOC,
    editable,
    editorProps: {
      attributes: {
        class: editable
          ? 'wiki-editor prose prose-neutral max-w-none min-h-[28rem] px-6 py-5 focus:outline-none'
          : 'wiki-editor wiki-editor-readonly prose prose-neutral max-w-none px-6 py-5 focus:outline-none',
      },
      handlePaste(_view, event) {
        if (!editable) return false;
        const file = fileFromClipboard(event.clipboardData);
        if (!file) return false;
        event.preventDefault();
        void insertClipboardImage(file);
        return true;
      },
      handleDrop(_view, event) {
        if (!editable) return false;
        const file = fileFromClipboard(event.dataTransfer);
        if (!file) return false;
        event.preventDefault();
        void insertClipboardImage(file);
        return true;
      },
    },
    onUpdate: ({ editor: current }) => {
      onChange(current.getJSON() as WikiDocJson);
    },
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

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
      <div className="min-h-[12rem] rounded-lg border border-border bg-card/50 px-6 py-5 text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div
      className={
        editable
          ? 'overflow-hidden rounded-lg border border-border bg-card/80 shadow-sm'
          : 'overflow-hidden'
      }
    >
      {editable ? (
        <EditorToolbar
          editor={editor}
          workspaceId={workspaceId}
          documentId={documentId}
        />
      ) : null}
      <EditorContent editor={editor} />
    </div>
  );
}
