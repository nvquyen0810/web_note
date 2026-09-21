import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { TableKit } from '@tiptap/extension-table';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import Typography from '@tiptap/extension-typography';
import Underline from '@tiptap/extension-underline';
import { ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { common, createLowlight } from 'lowlight';
import { Callout } from './callout';
import { CodeBlockView } from './code-block-view';
import { Mermaid } from './mermaid';
import { WikiImage } from './wiki-image';

const lowlight = createLowlight(common);

const CodeBlockWithCopy = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView);
  },
});

export function createWikiExtensions() {
  return [
    StarterKit.configure({
      codeBlock: false,
      heading: { levels: [1, 2, 3] },
    }),
    Underline,
    Typography,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: { class: 'text-primary underline underline-offset-2' },
    }),
    Placeholder.configure({
      placeholder: 'Start writing… Paste images with ⌘/Ctrl+V',
    }),
    TaskList,
    TaskItem.configure({ nested: true }),
    TableKit.configure({
      table: { resizable: true },
    }),
    CodeBlockWithCopy.configure({ lowlight }),
    WikiImage,
    Callout,
    Mermaid,
  ];
}
