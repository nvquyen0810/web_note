import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { CalloutView } from './callout-view';

export type CalloutType = 'info' | 'warning' | 'tip';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attrs?: { type?: CalloutType }) => ReturnType;
    };
  }
}

export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      type: {
        default: 'info' satisfies CalloutType,
        parseHTML: (element) =>
          (element.getAttribute('data-type') as CalloutType) ?? 'info',
        renderHTML: (attributes) => ({
          'data-type': attributes.type,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'aside[data-callout]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'aside',
      mergeAttributes(HTMLAttributes, { 'data-callout': '' }),
      0,
    ];
  },

  addCommands() {
    return {
      setCallout:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { type: attrs?.type ?? 'info' },
            content: [{ type: 'paragraph' }],
          }),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutView);
  },
});
