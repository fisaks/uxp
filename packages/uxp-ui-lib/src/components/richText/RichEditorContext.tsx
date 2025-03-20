import { Editor } from "@tiptap/core";
import { createContext, ReactNode, useContext, useRef, useState } from "react";
import * as Y from "yjs";

export interface RichTextEditorProps {
    label?: string;
    imageBasePath: string;
    onImageUpload: (file: File) => Promise<string>;
    yDoc: Y.Doc;
    editable?: boolean
}

export interface RichEditorUIState extends RichTextEditorProps {
    linkTagToEdit: HTMLAnchorElement | null;
    setLinkTagToEdit: (el: HTMLAnchorElement | null) => void;
    linkEditPopupPos: { top: number; left: number } | null;
    setLinkEditPopupPos: (pos: { top: number; left: number } | null) => void;
    imageToolbarPos: { top: number; left: number } | null;
    setImageToolbarPos: (pos: { top: number; left: number } | null) => void;
    portalContainerRef: React.RefObject<HTMLDivElement>;
    editorRootContainerRef: React.RefObject<HTMLDivElement>;
    editor?: Editor
    setEditor: (editor: Editor) => void;
    hasCamera: boolean | undefined;
    setHasCamera: (hasCamera: boolean) => void;

    isFullScreen: boolean,
    toggleFullScreen: () => void;

    triggerImageUpload: () => void;
    registerTriggerImageUpload: (func: RichEditorUIState["triggerImageUpload"]) => void;

    triggerCameraCapture: () => void;
    registerCameraCapture: (func: RichEditorUIState["triggerCameraCapture"]) => void;
}

const RichEditorContext = createContext<RichEditorUIState | undefined>(undefined);

export function RichEditorProvider({ children, ...props }: { children: ReactNode } & RichTextEditorProps) {

    const [linkTagToEdit, setLinkTagToEdit] = useState<HTMLAnchorElement | null>(null);
    const [imageToolbarPos, setImageToolbarPos] = useState<{ top: number; left: number } | null>(null);
    const [linkEditPopupPos, setLinkEditPopupPos] = useState<{ top: number; left: number } | null>(null);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [editor, setEditor] = useState<Editor | undefined>();
    const [hasCamera, setHasCamera] = useState<boolean | undefined>(undefined);
    const portalContainerRef = useRef<HTMLDivElement | null>(null);
    const editorRootContainerRef = useRef<HTMLDivElement | null>(null);
    const triggerImageUploadRef = useRef<() => void>(() => { });
    const triggerCameraCaptureRef = useRef<() => void>(() => { });

    const registerTriggerImageUpload = (fn: () => void) => {
        triggerImageUploadRef.current = fn;
    };
    const registerCameraCapture = (fn: () => void) => {
        triggerCameraCaptureRef.current = fn;
    };
    const toggleFullScreen = () => {
        setIsFullScreen(!isFullScreen);
    };
    return (
        <RichEditorContext.Provider value={{
            ...props,
            linkTagToEdit,
            setLinkTagToEdit,
            linkEditPopupPos,
            setLinkEditPopupPos,
            imageToolbarPos,
            setImageToolbarPos,
            portalContainerRef,
            editorRootContainerRef,
            isFullScreen,
            toggleFullScreen,
            editor,
            setEditor,
            hasCamera,
            setHasCamera,
            registerCameraCapture,
            triggerCameraCapture: () => triggerCameraCaptureRef?.current(),
            triggerImageUpload: () => triggerImageUploadRef?.current(),
            registerTriggerImageUpload
        }}>
            {children}
        </RichEditorContext.Provider>
    );
}

export function useRichEditorUI() {
    const context = useContext(RichEditorContext);
    if (!context) {
        throw new Error("useRichEditorUI must be used within a RichEditorProvider");
    }
    return context;
}
