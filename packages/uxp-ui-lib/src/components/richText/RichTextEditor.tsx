import { Paper, Typography } from "@mui/material";
import { EditorContent } from "@tiptap/react";
import React, { useCallback, useMemo, useRef, useState} from "react";
import * as styles from "./RichTextEditor.module.css";
import { FloatingImageToolbar } from "./components/FloatingImageToolbar";
import { RichEditorToolbar } from "./components/RichEditorToolbar";
import { useRichEditor } from "./components/useRichEditor";
import "prosemirror-view/style/prosemirror.css";
import * as Y from "yjs";



interface RichTextEditorProps {
    label?: string;
    imageBasePath: string;
    onImageUpload: (file: File) => Promise<string>;
    yDoc: Y.Doc;
    editable?: boolean
}

const RichTextEditor =({ label, onImageUpload, imageBasePath, yDoc, editable = true }:RichTextEditorProps) => {
    const portalContainerRef = useRef<HTMLDivElement | null>(null);
    const editorRootContainerRef = useRef<HTMLDivElement | null>(null);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [imageToolbarPos, setImageToolbarPos] = useState<{ top: number; left: number } | null>(null);
    const triggerImageUpload = useCallback(() => {
        fileInputRef.current?.click();
    }, [fileInputRef.current]);

    const slotProps = useMemo(() => ({ popper: { container: portalContainerRef.current } }), [portalContainerRef.current]);

    const editor = useRichEditor({
        editorRootContainerRef,
        setImageToolbarPos,
        triggerImageUpload,
        imageBasePath,
        editable: editable,
        yDoc: yDoc,

    }, [editable]);


    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            const file = event.target.files[0];
            const imageUrl = await onImageUpload(file);
            if (imageUrl) {
                editor?.chain().focus().setImage({ src: imageUrl }).run();
            }
        }
    };

    const toggleFullScreen = () => {
        setIsFullScreen(!isFullScreen);
    };

    if (!editor) return null;

    return (
        <Paper
            ref={editorRootContainerRef}
            elevation={3}
            sx={{ padding: 0 }}
            className={`${styles.editorContainer} ${isFullScreen ? styles.fullScreen : ""}`}
        >
            {
                label && <Typography variant="caption" color="text.secondary" sx={{ pl: "10px" }}>
                    {label}
                </Typography>
            }
            {editable && <RichEditorToolbar
                editor={editor}
                portalContainerRef={portalContainerRef}
                isFullScreen={isFullScreen}
                toggleFullScreen={toggleFullScreen}
                triggerImageUpload={triggerImageUpload}
                slotProps={slotProps}
            />}
            {editable && <FloatingImageToolbar
                editor={editor}
                imagePos={imageToolbarPos}
                slotProps={slotProps}
                onClick={() => setImageToolbarPos(null)}
            />}
            <input type="file" ref={fileInputRef} style={{ display: "none" }} accept="image/*" onChange={handleImageUpload} />

            <EditorContent editor={editor} className={styles.editorWrapper} />

            <div ref={portalContainerRef}></div>
        </Paper>
    );
};

export default RichTextEditor;
