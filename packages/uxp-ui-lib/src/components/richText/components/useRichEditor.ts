import Blockquote from '@tiptap/extension-blockquote';
import BulletList from '@tiptap/extension-bullet-list';
import CodeBlock from '@tiptap/extension-code-block';
import Collaboration from "@tiptap/extension-collaboration";
import Document from '@tiptap/extension-document';
import Focus from "@tiptap/extension-focus";
import HardBreak from '@tiptap/extension-hard-break';
import Heading from '@tiptap/extension-heading';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import ListItem from '@tiptap/extension-list-item';
import OrderedList from '@tiptap/extension-ordered-list';
import Paragraph from '@tiptap/extension-paragraph';
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Table from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import Text from '@tiptap/extension-text';
import Underline from "@tiptap/extension-underline";
import { Extension, useEditor } from "@tiptap/react";

import Bold from '@tiptap/extension-bold';
import Code from '@tiptap/extension-code';
import Italic from '@tiptap/extension-italic';
import Strike from '@tiptap/extension-strike';

import DropCursor from '@tiptap/extension-dropcursor';
import GapCursor from '@tiptap/extension-gapcursor';

import { EditorView } from "prosemirror-view"; //  Import directly from ProseMirror
import React, { useEffect, useRef, useState } from "react";

import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import * as Y from "yjs";
import Attachment from "../extensions/Attachment";
import { CustomLink } from "../extensions/CustomLink";
import { DropExtension } from "../extensions/DropExtension";
import { Indent } from "../extensions/Indent";
import { LineHeight } from "../extensions/LineHeight";
import { ResizableImage } from "../extensions/ResizableImage";
import { UploadPlaceholder } from "../extensions/UploadPlaceholder";
import { Video } from "../extensions/Video";
import { Youtube } from "../extensions/Youtube";
import { RichEditorUIState, UploadSource, UploadType, useRichEditorUI } from "../RichEditorContext";


export const useRichEditor = (
) => {
    const editorState = useRichEditorUI();
    const [editorMounted, setEditorMounted] = useState(false)
    const { docInstanceId, setEditor, imageBasePath, editable, yDoc, fileDropHandler, awareness } = editorState;
    let timeoutRef = useRef<NodeJS.Timeout | null>(null); //
    const editor = useEditor(
        {

            editable: editable,
            autofocus: true,
            enableContentCheck: true,
            onContentError: (error) => {
                console.error("[useRichEditor] Content Error", error);
            },
            onDrop: (event) => {
                console.log("[useRichEditor] Dropped", event);
            },
            extensions: getRichEditorExtensions({ basePath: imageBasePath, yDoc, awareness, fileDropHandler, forPreview: false }),
            editorProps: {
                handleClick: (view, pos, event) => {
                    combinedHandleClick(editorState, timeoutRef)(view, pos, event);
                },

                handleKeyDown: combinedKeyDownHandlers(editorState),

            },
            onCreate: ({ editor }) => {
                setEditorMounted(true)
            },
            //  onUpdate: ({ editor }) => {
            //    console.log("[useRichEditor] onUpdate", editor.getJSON());
            //}
        },
        [docInstanceId]
    );

    useEffect(() => {
        queueMicrotask(() => {
            editor?.setEditable(editable ?? false);
        });
    }, [editable]);

    useEffect(() => {
        if (editorMounted && editor) {
            queueMicrotask(() => {
                setEditor(editor);
                console.log("[useRichEditor] Editor created", awareness?.getLocalState());
            })
        }
    }, [editor, editorMounted]);

    return editor;
};

// in shared/editor/getExtensions.ts
export function getRichEditorExtensions(opts: {
    basePath: string;
    yDoc?: Y.Doc;
    awareness?: any;
    fileDropHandler?: ((files: File[]) => void) | null;
    forPreview?: boolean;
}) {
    const {
        basePath,
        yDoc,
        awareness,
        fileDropHandler,
        forPreview = false,
    } = opts;

    return [
        Document,
        Text,
        Paragraph,
        Heading.configure({ levels: [1, 2, 3, 4, 5, 6] }),
        Blockquote,
        CodeBlock,
        HorizontalRule,
        HardBreak,
        BulletList,
        OrderedList,
        ListItem,

        Bold,
        Code,
        Italic,
        Strike,

        DropCursor,
        GapCursor,

        Underline,
        ResizableImage.configure({ basePath }),
        LineHeight,
        Indent,
        Youtube,
        CustomLink.configure({
            openOnClick: false,
            autolink: false,     // Automatically detect and format links
            linkOnPaste: true,  // Automatically turn pasted links into clickable links
            HTMLAttributes: {
                rel: "noopener noreferrer",
                target: "_blank",
            },
        }),
        Subscript,
        Superscript.extend({
            ...(forPreview ? {} : {
                addKeyboardShortcuts() {
                    return {
                        "Ctrl-Shift-,": () => this.editor.commands.toggleSuperscript(),
                    };
                }
            })
        }),
        Table.configure({ resizable: true }).extend({
            ...(forPreview ? {} : {
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
                }
            }),
        }),
        TableRow,
        TableHeader,
        TableCell,
        Focus.configure({}),
        Video.configure({ basePath }),
        Attachment.configure({ basePath }),
        UploadPlaceholder,
        ...(yDoc ? [Collaboration.configure({ document: yDoc })] : []),
        ...(awareness ? [CollaborationCursor.configure({ provider: { awareness } })] : []),
        ...(fileDropHandler ? [DropExtension.configure({
            handleFileDrop: fileDropHandler,
        })] : []),


    ] as Extension[];
}


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
    if (el.hasAttribute("data-youtube-id")) {
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


const combinedKeyDownHandlers = ({ triggerUpload }: RichEditorUIState) => (view: EditorView, event: KeyboardEvent) => {
    const handlers = [(v: EditorView, e: KeyboardEvent) => handleInsertImage(triggerUpload, v, e)];

    for (const handler of handlers) {
        if (handler(view, event)) return; //  Stop processing if a handler handled the event
    }
};

const handleInsertImage = (triggerUpload: (type: UploadType, source?: UploadSource) => void, _view: EditorView, event: KeyboardEvent) => {
    if (event.ctrlKey && event.shiftKey && event.key === "I") {
        event.preventDefault();
        triggerUpload("image", "file");
        return true;
    }
    return false;
};
