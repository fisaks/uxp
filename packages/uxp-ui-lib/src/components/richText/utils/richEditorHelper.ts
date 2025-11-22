import { Editor, JSONContent } from "@tiptap/core";
import { getRichEditorExtensions } from "../components/useRichEditor";
import { DiffWrapper } from "../extensions/DiffWrapper";
import { DiffMark } from "../extensions/DiffMark";
import * as Y from "yjs";

export const yDocToJson = (yDoc: Y.Doc, options: { basePath: string }): JSONContent => {
    const editor = new Editor({
        extensions: [...getRichEditorExtensions({
            basePath: options.basePath,
            yDoc
        }), DiffMark, DiffWrapper],
        editable: false,
    });

    return editor.getJSON();
}
