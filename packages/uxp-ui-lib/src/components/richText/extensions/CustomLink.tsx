
import Link from "@tiptap/extension-link";

declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        CustomLink: {
            toggleLinkCustom: () => ReturnType;

        };
    }
}

export const CustomLink = Link.extend({
    addCommands() {
        return {
            ...this.parent?.(),
            toggleLinkCustom:
                () =>
                    ({ editor, chain}) => {
                        if (editor.isActive("link")) {
                            chain().focus().unsetLink().run();
                            return true;
                        }

                        const selectedText = editor.state.doc.textBetween(
                            editor.state.selection.from,
                            editor.state.selection.to,
                            ""
                        ).trim();

                        const url = selectedText.includes("://") ? selectedText : `//${selectedText}`;
                        chain().focus().setLink({ href: url, target: "_blank" }).run();

                        return true;
                    },
        };
    },

    addKeyboardShortcuts() {
        return {
            "Mod-Shift-K": () => this.editor.commands.toggleLinkCustom(),
        };
    },
});
