import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { TableKit } from '@tiptap/extension-table';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import Typography from '@tiptap/extension-typography';
import Underline from '@tiptap/extension-underline';
import StarterKit from '@tiptap/starter-kit';
import { common, createLowlight } from 'lowlight';
import { Callout } from './callout';
import { Mermaid } from './mermaid';

const lowlight = createLowlight(common);

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
      placeholder: 'Start writing…',
    }),
    TaskList,
    TaskItem.configure({ nested: true }),
    TableKit.configure({
      table: { resizable: true },
    }),
    CodeBlockLowlight.configure({ lowlight }),
    Image.configure({
      allowBase64: false,
      HTMLAttributes: { class: 'rounded-md max-w-full h-auto' },
    }),
    Callout,
    Mermaid,
  ];
}
