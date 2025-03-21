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


export type LinkEditPopupProps = {
    href: string
    setHref: (editor: Editor, href: string) => void;
    popupPos: { top: number; left: number };
}
type CameraCapture = {
    image: RichEditorUIState["triggerImageUpload"]
    video: RichEditorUIState["triggerVideoUpload"]
}
type FileUpload = {
    image: RichEditorUIState["triggerImageCapture"]
    video: RichEditorUIState["triggerVideoCapture"]

}
export interface RichEditorUIState extends RichTextEditorProps {

    linkEditPopupProps: LinkEditPopupProps | null;
    setLinkEditPopupProps: (props: LinkEditPopupProps | null) => void;
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
    triggerVideoUpload: () => void;
    registerImageUpload: (props: FileUpload) => void

    triggerImageCapture: () => void;
    triggerVideoCapture: () => void;
    registerCameraCapture: (props: CameraCapture) => void
}

const RichEditorContext = createContext<RichEditorUIState | undefined>(undefined);

export function RichEditorProvider({ children, ...props }: { children: ReactNode } & RichTextEditorProps) {

    const [linkEditPopupProps, setLinkEditPopupProps] = useState<LinkEditPopupProps | null>(null);
    const [imageToolbarPos, setImageToolbarPos] = useState<{ top: number; left: number } | null>(null);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [editor, setEditor] = useState<Editor | undefined>();
    const [hasCamera, setHasCamera] = useState<boolean | undefined>(undefined);
    const portalContainerRef = useRef<HTMLDivElement | null>(null);
    const editorRootContainerRef = useRef<HTMLDivElement | null>(null);
    const triggerImageUploadRef = useRef<() => void>(() => { });
    const triggerVideoUploadRef = useRef<() => void>(() => { });
    const triggerImageCaptureRef = useRef<() => void>(() => { });
    const triggerVideoCaptureRef = useRef<() => void>(() => { });

    const registerImageUpload = (props: FileUpload) => {
        triggerImageUploadRef.current = props.image;;
        triggerVideoUploadRef.current = props.video;
    };
    const registerCameraCapture = (props: CameraCapture) => {
        triggerImageCaptureRef.current = props.image;
        triggerVideoCaptureRef.current = props.video;
    };
    const toggleFullScreen = () => {
        setIsFullScreen(!isFullScreen);
    };
    return (
        <RichEditorContext.Provider value={{
            ...props,
            linkEditPopupProps, setLinkEditPopupProps,
            imageToolbarPos, setImageToolbarPos,
            portalContainerRef,
            editorRootContainerRef,
            isFullScreen, toggleFullScreen,
            editor, setEditor,
            hasCamera, setHasCamera,
            registerCameraCapture,
            triggerImageCapture: () => triggerImageCaptureRef?.current(),
            triggerVideoCapture: () => triggerVideoCaptureRef?.current(),
            registerImageUpload,
            triggerImageUpload: () => triggerImageUploadRef?.current(),
            triggerVideoUpload: () => triggerVideoUploadRef?.current(),

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
