import type { Editor } from '@tiptap/react';
import Image from '@tiptap/extension-image';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { WikiImageView } from './wiki-image-view';

export const WikiImage = Image.extend({
  name: 'image',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => element.getAttribute('src'),
        renderHTML: (attributes) =>
          attributes.src ? { src: attributes.src } : {},
      },
      alt: {
        default: null,
        parseHTML: (element) => element.getAttribute('alt'),
        renderHTML: (attributes) =>
          attributes.alt ? { alt: attributes.alt } : {},
      },
      title: {
        default: null,
        parseHTML: (element) => element.getAttribute('title'),
        renderHTML: (attributes) =>
          attributes.title ? { title: attributes.title } : {},
      },
      fileId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-file-id'),
        renderHTML: (attributes) =>
          attributes.fileId ? { 'data-file-id': attributes.fileId } : {},
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(WikiImageView);
  },
});

export function insertWikiImage(
  editor: Editor,
  attrs: { src: string; alt?: string; fileId: string },
) {
  return editor
    .chain()
    .focus()
    .insertContent({
      type: 'image',
      attrs: {
        src: attrs.src,
        alt: attrs.alt ?? null,
        fileId: attrs.fileId,
      },
    })
    .run();
}
