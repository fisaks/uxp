import { Extension } from '@tiptap/core';

export interface IndentOptions {
    indentSize: number; // Default size of indentation (e.g., 20px per level)
    types: string[],
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        Indent: {
            increaseIndent: () => ReturnType,
            decreaseIndent: () => ReturnType,
        }
    }
}


export const Indent = Extension.create<IndentOptions>({
    name: 'indent',

    addOptions() {
        return {
            indentSize: 20,
            types: ['paragraph', 'heading'],
        }
    },

    addGlobalAttributes() {
        return [
            {
                types: this.options.types,
                attributes: {

                    indent: {

                        default: 0,
                        //parseHTML: (element) => parseInt(element.style.marginLeft, 10) || 0,
                        parseHTML: (element) => {
                            const marginLeft = window.getComputedStyle(element).marginLeft; 
                            const parsedIndent = parseInt(marginLeft.replace('px', ''), 10);

                            if (isNaN(parsedIndent)) {
                                return 0; 
                            }
                            return parsedIndent / 20; 
                        },
                        //parseHTML: (element) => 0,
                        renderHTML: (attributes) => {

                            return {style: attributes.indent ? `margin-left: ${attributes.indent * this.options.indentSize}px;` : ''}
                        },
                    },
                },
            },
        ];
    },

    addCommands() {
        return {
            increaseIndent:
                () =>
                    ({ editor, chain }) => {
                        return this.options.types
                            .map(type => {
                                const currentIndent = editor.getAttributes(type).indent || 0;
                                return chain().updateAttributes(type, { indent: currentIndent + 1 }).run()
                            }).every(response => response)
                    },


            decreaseIndent:
                () =>
                    ({ editor, chain }) => {
                        return this.options.types
                            .map(type => {
                                const currentIndent = editor.getAttributes(type).indent || 0;
                                return chain().updateAttributes(type, { indent: Math.max(0, currentIndent - 1) }).run()
                            }).every(response => response)
                    }


        }
    },
    addKeyboardShortcuts() {
        return {
          'Ctrl-Space': () => this.editor.commands.increaseIndent(),
          'Ctrl-Shift-Space': () => this.editor.commands.decreaseIndent()
        }
      },
});
