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
export type UploadType = "image" | "video" | "document";
export type UploadSource = "file" | "camera";

export type UploadTriggerMap = Partial<Record<UploadType, () => void>>;
export type TriggerRegistry = Record<UploadSource, UploadTriggerMap> & {};

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

  registerUploadTrigger: (
    triggers: UploadTriggerMap,
    options?: { source?: UploadSource }
  ) => void;
  triggerUpload: (type: UploadType, source?: UploadSource) => void;
  registerFileDropHandler: (fn: (files: File[]) => void) => void;
  fileDropHandler: ((files: File[]) => void) | null;
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
  const fileDropHandler = useRef<((files: File[]) => void) | null>(null);
  const triggerRegistry = useRef<TriggerRegistry>({
    file: {},
    camera: {},
  });

  const registerFileDropHandler = (fn: (files: File[]) => void) => {
    fileDropHandler.current = fn
  };


  const registerUploadTrigger = (
    triggers: UploadTriggerMap,
    options?: { source?: UploadSource }
  ) => {
    const source = options?.source ?? "file";
    triggerRegistry.current[source] = {
      ...triggerRegistry.current[source],
      ...triggers,
    };
  };

  const triggerUpload = (type: UploadType, source: UploadSource = "file") => {
    const trigger = triggerRegistry.current[source]?.[type];
    if (trigger) {
      trigger();
    } else {
      console.warn(`No upload trigger registered for [${type}] from [${source}]`);
    }
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
      registerUploadTrigger,
      triggerUpload,
      fileDropHandler: (files:File[]) => fileDropHandler.current && fileDropHandler.current(files), registerFileDropHandler

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
