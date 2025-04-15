import { Node } from '@tiptap/core';

export const DiffWrapper = Node.create({
  name: 'diffWrapper',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      type: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-diff]' }];
  },

  renderHTML({ node }) {
    return [
      'div',
      {
        'data-diff': node.attrs.type,
        class: `diff-wrapper diff-${node.attrs.type}`,
      },
      0,
    ];
  },
});
