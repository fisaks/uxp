import Collaboration from "@tiptap/extension-collaboration";
import Focus from "@tiptap/extension-focus";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Table from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import Underline from "@tiptap/extension-underline";
import { Editor, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { EditorView } from "prosemirror-view"; //  Import directly from ProseMirror
import React, { useRef } from "react";
import { CustomLink } from "../extensions/CustomLink";
import { Indent } from "../extensions/Indent";
import { LineHeight } from "../extensions/LineHeight";
import { ResizableImage } from "../extensions/ResizableImage";
import { RichEditorUIState, useRichEditorUI } from "../RichEditorContext";


export const useRichEditor = (
) => {
    const { setEditor, editorRootContainerRef, triggerImageUpload, setImageToolbarPos, setLinkTagToEdit, imageBasePath, editable, yDoc } = useRichEditorUI();
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
                    openOnClick: !editable, // Open links in a new tab when clicked
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

            ],
            editorProps: {
                handleClick: (view, pos, event) => {
                    combinedHandleClick(editor, editorRootContainerRef, setImageToolbarPos, timeoutRef, setLinkTagToEdit)(view, pos, event);
                },

                handleKeyDown: combinedKeyDownHandlers(triggerImageUpload),
                
            },
            onCreate: ({ editor }) => {
                setEditor(editor);

            }
        },
        [editable]
    );

    return editor;
};

const combinedHandleClick =
    (
        editor: Editor | null,
        editorRootContainerRef: RichEditorUIState["editorRootContainerRef"],
        setImageToolbarPos: RichEditorUIState["setImageToolbarPos"],
        timeoutRef: React.MutableRefObject<NodeJS.Timeout | null>,
        setLinkTagToEdit: RichEditorUIState["setLinkTagToEdit"]
    ) =>
        (view: EditorView, pos: number, event: MouseEvent) => {
            const handlers = [
                (v: EditorView, p: number, e: MouseEvent) => handleImageClick(v, p, e, setImageToolbarPos, timeoutRef, editorRootContainerRef),
                (v: EditorView, p: number, e: MouseEvent) => handleTableClick(v, p, e, editor),
                (v: EditorView, p: number, e: MouseEvent) => handleLinkClick(v, p, e, setLinkTagToEdit),
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
    setImageToolbarPos: RichEditorUIState["setImageToolbarPos"],
    timeoutRef: React.MutableRefObject<NodeJS.Timeout | null>,
    editorRootContainerRef: RichEditorUIState["editorRootContainerRef"]
) => {
    //const node = view.state.doc.nodeAt(pos);
    const el=(event.target as HTMLElement|null);
    
    //if (node?.type.name !== "image" || el?.tagName!===) return false;
    if(el?.tagName!=="IMG") {
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

const handleTableClick = (view: EditorView, _pos: number, event: MouseEvent, editor: Editor | null) => {
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
    view: EditorView,
    _pos: number,
    event: MouseEvent,
    setLinkTagToEdit: RichEditorUIState["setLinkTagToEdit"]
) => {
    const shadowRoot = view.dom.getRootNode();
    const clickedElement = (shadowRoot as ShadowRoot).elementFromPoint(event.clientX, event.clientY);

    if (clickedElement?.tagName !== "A") return false;
    setLinkTagToEdit(event.target as HTMLAnchorElement);

    return true;
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
