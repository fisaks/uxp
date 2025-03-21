import Collaboration from "@tiptap/extension-collaboration";
import Focus from "@tiptap/extension-focus";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Table from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import Underline from "@tiptap/extension-underline";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { EditorView } from "prosemirror-view"; //  Import directly from ProseMirror
import React, { useEffect, useRef } from "react";
import { CustomLink } from "../extensions/CustomLink";
import { Indent } from "../extensions/Indent";
import { LineHeight } from "../extensions/LineHeight";
import { ResizableImage } from "../extensions/ResizableImage";
import { Video } from "../extensions/Video";
import { RichEditorUIState, useRichEditorUI } from "../RichEditorContext";



export const useRichEditor = (
) => {
    const editorState = useRichEditorUI();
    const { setEditor, imageBasePath, editable, yDoc } = editorState;
    let timeoutRef = useRef<NodeJS.Timeout | null>(null); //
    const editor = useEditor(
        {

            editable: editable,
            autofocus: true,
            enableContentCheck: true,
            onContentError: (error) => {
                console.error("Content Error", error);
            },
            onDrop: (event) => {
                console.log("Dropped", event);
            },
            extensions: [
                StarterKit.configure({
                    history: false,
                    heading: { levels: [1, 2, 3, 4, 5, 6] },
                }),
                Underline,
                ResizableImage.configure({ basePath: imageBasePath }),
                LineHeight,
                Indent,
                CustomLink.configure({
                    openOnClick: false,
                    autolink: true,     // Automatically detect and format links
                    linkOnPaste: true,  // Automatically turn pasted links into clickable links
                    HTMLAttributes: {
                        rel: "noopener noreferrer",
                        target: "_blank",
                    }
                }),
                Subscript,
                Superscript.extend({
                    addKeyboardShortcuts() {
                        return {
                            "Ctrl-Shift-,": () => this.editor.commands.toggleSuperscript(),
                        };
                    },
                }),
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
                Collaboration.configure({
                    document: yDoc, // ✅ Uses shared Y.js state
                }),
                Video.configure({ basePath: imageBasePath })

            ],
            editorProps: {
                handleClick: (view, pos, event) => {
                    combinedHandleClick(editorState, timeoutRef)(view, pos, event);
                },

                handleKeyDown: combinedKeyDownHandlers(editorState),

            },
            onCreate: ({ editor }) => {
                setEditor(editor);

            },
        },
        []
    );

    useEffect(() => {
        editor?.setEditable(editable ?? false);
    }, [editable]);
    return editor;
};

const combinedHandleClick =
    (
        editorState: RichEditorUIState,
        timeoutRef: React.MutableRefObject<NodeJS.Timeout | null>,

    ) =>
        (view: EditorView, pos: number, event: MouseEvent) => {
            const handlers = [
                (v: EditorView, p: number, e: MouseEvent) => handleImageClick(v, p, e, editorState, timeoutRef),
                (v: EditorView, p: number, e: MouseEvent) => handleTableClick(v, p, e, editorState),
                (v: EditorView, p: number, e: MouseEvent) => handleLinkClick(v, p, e, editorState),
            ];

            for (const handler of handlers) {
                if (handler(view, pos, event)) return; //  Stop processing if a handler handled the event
            }

            editorState.setImageToolbarPos(null); // Default fallback if no handlers processed the event
        };

const handleImageClick = (
    view: EditorView,
    pos: number,
    event: MouseEvent,
    { setImageToolbarPos, editorRootContainerRef }: RichEditorUIState,
    timeoutRef: React.MutableRefObject<NodeJS.Timeout | null>

) => {
    //const node = view.state.doc.nodeAt(pos);
    const el = (event.target as HTMLElement | null);

    //if (node?.type.name !== "image" || el?.tagName!===) return false;
    if (el?.tagName !== "IMG") {
        setImageToolbarPos(null);
        return false;
    }

    //const shadowRoot = view.dom.getRootNode();
    //const clickedElement = (shadowRoot as ShadowRoot).elementFromPoint(event.clientX, event.clientY);
    const containerRect = editorRootContainerRef.current?.getBoundingClientRect();
    //console.log("image clicked")
    //if (clickedElement?.tagName === "IMG") {
    //  console.log("image clicked",event.clientY - (containerRect?.top ?? 0),event.clientX - (containerRect?.left ?? 0))
    setImageToolbarPos({
        top: event.clientY - (containerRect?.top ?? 0),
        left: event.clientX - (containerRect?.left ?? 0),
    });

    if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => setImageToolbarPos(null), 5000);
    //} else {
    //  setImageToolbarPos(null);
    //}

    return true; // Returning true means this handler handled the event
};

const handleTableClick = (view: EditorView, _pos: number, event: MouseEvent, { editor }: RichEditorUIState,) => {
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
const handleLinkClick = (
    _view: EditorView,
    _pos: number,
    event: MouseEvent,
    { setLinkEditPopupProps, editorRootContainerRef }: RichEditorUIState,

) => {
    const el = (event.target as HTMLElement | null);
    const linkElement = el?.closest("a");

    if (!linkElement) return false;
    const containerRect = editorRootContainerRef.current?.getBoundingClientRect();
    setLinkEditPopupProps({
        href: linkElement.getAttribute("href") ?? "",
        popupPos: {
            top: event.clientY - (containerRect?.top ?? 0),
            left: event.clientX - (containerRect?.left ?? 0),
        },
        setHref: (editor, href) => {
            editor.chain().focus().extendMarkRange('link').setLink({ href }).run()
        }
    });
    return true;
};


const combinedKeyDownHandlers = ({ triggerImageUpload }: RichEditorUIState) => (view: EditorView, event: KeyboardEvent) => {
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
