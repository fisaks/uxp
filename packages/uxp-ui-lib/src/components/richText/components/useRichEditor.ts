import BulletList from "@tiptap/extension-bullet-list";
import Focus from "@tiptap/extension-focus";
import Heading from "@tiptap/extension-heading";
import ListItem from "@tiptap/extension-list-item";
import OrderedList from "@tiptap/extension-ordered-list";
import Table from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import Underline from "@tiptap/extension-underline";
import { Editor, useEditor, UseEditorOptions } from "@tiptap/react";

import StarterKit from "@tiptap/starter-kit";
import { EditorView } from "prosemirror-view"; //  Import directly from ProseMirror
import React, { DependencyList, useRef } from "react";
import { Indent } from "../extensions/Indent";
import { LineHeight } from "../extensions/LineHeight";
import { ResizableImage } from "../extensions/ResizableImage";

type UseEditorMenuOptions = {
    editorRootContainerRef: React.RefObject<HTMLDivElement | null>;
    setImageToolbarPos: React.Dispatch<React.SetStateAction<{ top: number; left: number } | null>>;
    triggerImageUpload: () => void;
    imageBasePath: string;
};
export const useRichEditor = (
    { editorRootContainerRef, setImageToolbarPos, triggerImageUpload, ...options }: UseEditorOptions & UseEditorMenuOptions,
    deps?: DependencyList
) => {
    let timeoutRef = useRef<NodeJS.Timeout | null>(null); //
    const editor = useEditor(
        {
            extensions: [
                StarterKit,
                Underline,
                ResizableImage.configure({ basePath: options.imageBasePath }),
                BulletList,
                OrderedList,
                ListItem,
                LineHeight,
                Indent,
                Table.configure({ resizable: true }).extend({
                    addKeyboardShortcuts() {
                        return {
                            "Ctrl-Alt-Shift-Insert": () => this.editor.commands.insertTable({ rows: 3, cols: 3 }),
                            "Ctrl-Insert": () => this.editor.commands.addColumnBefore(),
                            "Ctrl-Shift-Insert": () => this.editor.commands.addColumnAfter(),
                            "Alt-Insert": () => this.editor.commands.addRowBefore(),
                            "Alt-Shift-Insert": () => this.editor.commands.addRowAfter(),

                            "Ctrl-Delete": () => this.editor.commands.deleteColumn(),
                            "Alt-Delete": () => this.editor.commands.deleteRow(),
                            "Ctrl-Alt-Shift-Delete": () => this.editor.commands.deleteTable(),
                        };
                    },
                }),
                TableRow,
                Focus.configure({}),
                TableHeader,
                TableCell,
                Heading.configure({ levels: [1, 2, 3, 4, 5, 6] }),

                ...(options?.extensions ?? []),
            ],
            editorProps: {
                handleClick: (view, pos, event) => {
                    combinedHandleClick(editor, editorRootContainerRef, setImageToolbarPos, timeoutRef)(view, pos, event);
                },

                handleKeyDown: combinedKeyDownHandlers(triggerImageUpload),
                ...(options?.editorProps ?? {}),
            },
            ...options,
        },
        deps
    );
    return editor;
};

const combinedHandleClick =
    (
        editor: Editor | null,
        editorRootContainerRef: UseEditorMenuOptions["editorRootContainerRef"],
        setImageToolbarPos: UseEditorMenuOptions["setImageToolbarPos"],
        timeoutRef: React.MutableRefObject<NodeJS.Timeout | null>
    ) =>
    (view: EditorView, pos: number, event: MouseEvent) => {
        const handlers = [
            (v: EditorView, p: number, e: MouseEvent) => handleImageClick(v, p, e, setImageToolbarPos, timeoutRef, editorRootContainerRef),
            (v: EditorView, p: number, e: MouseEvent) => handleTableClick(v, p, e, editor),
        ];

        for (const handler of handlers) {
            if (handler(view, pos, event)) return; //  Stop processing if a handler handled the event
        }

        setImageToolbarPos(null); // Default fallback if no handlers processed the event
    };

const handleImageClick = (
    view: EditorView,
    pos: number,
    event: MouseEvent,
    setImageToolbarPos: UseEditorMenuOptions["setImageToolbarPos"],
    timeoutRef: React.MutableRefObject<NodeJS.Timeout | null>,
    editorRootContainerRef: UseEditorMenuOptions["editorRootContainerRef"]
) => {
    const node = view.state.doc.nodeAt(pos);

    if (node?.type.name !== "image") return false;

    const shadowRoot = view.dom.getRootNode();
    const clickedElement = (shadowRoot as ShadowRoot).elementFromPoint(event.clientX, event.clientY);
    const containerRect = editorRootContainerRef.current?.getBoundingClientRect();

    if (clickedElement?.tagName === "IMG") {
        setImageToolbarPos({
            top: event.clientY - (containerRect?.top ?? 0),
            left: event.clientX - (containerRect?.left ?? 0),
        });

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => setImageToolbarPos(null), 5000);
    } else {
        setImageToolbarPos(null);
    }

    return true; // Returning true means this handler handled the event
};

const handleTableClick = (view: EditorView, pos: number, event: MouseEvent, editor: Editor | null) => {
    const shadowRoot = view.dom.getRootNode();
    const clickedElement = (shadowRoot as ShadowRoot).elementFromPoint(event.clientX, event.clientY);

    if (clickedElement?.tagName !== "TABLE") return false;

    const lastNode = view.state.doc.lastChild;
    if (lastNode?.type.name === "table") {
        const endPos = editor?.state.doc.content.size;
        if (endPos) {
            editor?.chain().focus().insertContentAt(endPos, "<p></p>").run();
        }
    }

    return true; // Returning true means this handler handled the event
};

const combinedKeyDownHandlers = (triggerImageUpload: () => void) => (view: EditorView, event: KeyboardEvent) => {
    const handlers = [(v: EditorView, e: KeyboardEvent) => handleInsertImage(triggerImageUpload, v, e)];

    for (const handler of handlers) {
        if (handler(view, event)) return; //  Stop processing if a handler handled the event
    }
};

const handleInsertImage = (triggerImageUpload: () => void, _view: EditorView, event: KeyboardEvent) => {
    if (event.ctrlKey && event.shiftKey && event.key === "I") {
        event.preventDefault();
        triggerImageUpload();
        return true;
    }
    return false;
};
