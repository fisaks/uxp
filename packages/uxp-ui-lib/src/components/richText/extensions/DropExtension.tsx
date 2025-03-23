// DropExtension.ts
import { Extension } from "@tiptap/core";
import { Plugin } from "prosemirror-state";
import { EditorView } from "prosemirror-view";

type UploadHandlers = {
    handleFileDrop: (files: File[], event: DragEvent) => void;
};

export const DropExtension = Extension.create<UploadHandlers>({
    name: "fileDrop",

    addOptions() {
        return {
            handleFileDrop: () => { }, // default noop
        };
    },

    addProseMirrorPlugins() {
        return [
            new Plugin({
                /*view: (view: EditorView) => {
                    const dom = view.dom;

                    const dragOverListener = (event: DragEvent) => {

                        event.preventDefault();

                        if (event.dataTransfer) {
                            event.dataTransfer.dropEffect = "copy";
                        }

                    };

                    dom.addEventListener("dragover", dragOverListener);

                    return {
                        destroy() {
                            dom.removeEventListener("dragover", dragOverListener);
                        },
                    };
                },*/
                props: {

                    handleDrop: (view: EditorView, event: DragEvent) => {

                        event.preventDefault();
                        if (!view.editable) {
                            return true;
                        }

                        const files = Array.from(event.dataTransfer?.files || []);

                        if (!files.length) return false;

                        this.options.handleFileDrop(files, event);

                        return true;
                    }
                }

            }),
        ];
    },
});
