import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { MermaidView } from './mermaid-view';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mermaid: {
      setMermaid: (attrs?: { source?: string }) => ReturnType;
    };
  }
}

export const Mermaid = Node.create({
  name: 'mermaid',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      source: {
        default: 'flowchart TD\n  A[Start] --> B[End]',
        parseHTML: (element) => element.getAttribute('data-source') ?? '',
        renderHTML: (attributes) => ({
          'data-source': attributes.source,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-mermaid]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-mermaid': '' }),
    ];
  },

  addCommands() {
    return {
      setMermaid:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              source:
                attrs?.source ?? 'flowchart TD\n  A[Start] --> B[End]',
            },
          }),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidView);
  },
});
