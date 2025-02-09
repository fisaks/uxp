import { Extension } from '@tiptap/core';

export interface LineHeightOptions {
    types: string[],
}
declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        LineHeight: {

            setLineHeight: (lineHeight: string) => ReturnType,
        }
    }
}
export const LineHeight = Extension.create<LineHeightOptions>({
    name: 'lineHeight',

    addOptions() {
        return {
            types: ['paragraph', 'heading'],
        }
    },

    addGlobalAttributes() {
        return [
            {
                types: this.options.types,
                attributes: {
                    lineHeight: {
                        default: '1.5',
                        parseHTML: (element) => element.style.lineHeight || '2.0',
                        renderHTML: (attributes) => {
                            return attributes.lineHeight ? { style: `line-height: ${attributes.lineHeight};` } : {};
                        },
                    },
                },
            },
        ];
    },

    addCommands() {
        return {
            setLineHeight:
                (value: string) =>
                    ({ chain }) => {

                        return this.options.types
                            .map(type => chain().updateAttributes(type, { lineHeight: value }).run())
                            .every(response => response)
                    },
        };
    },
    addKeyboardShortcuts() {
        return {
          'Ctrl-Shift-1': () => this.editor.commands.setLineHeight('1.2'),
          'Ctrl-Shift-2': () => this.editor.commands.setLineHeight('1.5'),
          'Ctrl-Shift-3': () => this.editor.commands.setLineHeight('2.0'),
        }
      },
});
