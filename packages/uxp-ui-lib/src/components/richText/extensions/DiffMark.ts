import { Mark } from '@tiptap/core';

export const DiffMark = Mark.create({
  name: 'diff',

  addAttributes() {
    return {
      type: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-diff]' }];
  },

  renderHTML({ mark }) {
    return [
      'span',
      {
        'data-diff': mark.attrs.type,
        class: `diff-inline diff-${mark.attrs.type}`,
      },
    ];
  },
});
