import { Paper, Typography, useTheme } from "@mui/material";
import { EditorContent } from "@tiptap/react";
import { useRichEditorUI } from "./RichEditorContext";
import * as styles from "./RichTextEditor.module.css";
import { FloatingImageToolbar } from "./components/FloatingImageToolbar";
import { LinkEdit } from "./components/LinkEdit";
import { RichEditorToolbar } from "./components/RichEditorToolbar";
import { RichEditorUploadManager } from "./components/RichEditorUploadManager";
import { useRichEditor } from "./components/useRichEditor";
import { EditorStatusNotice } from "./components/EditorStatusNotice";


export const RichTextEditorContent = () => {
    const { editor, editorRootContainerRef, portalContainerRef, isFullScreen, label, editable, notice } = useRichEditorUI();
    const theme = useTheme();
    const isDarkMode = theme.palette.mode === 'dark';
    useRichEditor();
    if (!editor) return null;

    return (

        <Paper
            ref={editorRootContainerRef}
            elevation={3}
            sx={{ padding: 0 }}
            style={{
                '--editor-focus-color': theme.palette.primary.main,
                '--editor-awareness-text': isDarkMode ? '#fff' : '#0d0d0d'

            } as React.CSSProperties}
            className={`${styles.editorContainer} ${isFullScreen ? styles.fullScreen : ""}`}
        >

            {label && <Typography variant="caption" color="text.secondary" sx={{ pl: "10px" }}>
                {label}
            </Typography>}

            {editable && <RichEditorToolbar />}
            {editable && <FloatingImageToolbar />}
            {editable && <LinkEdit />}

            <RichEditorUploadManager />

            {/* The actual Editor */}
            <EditorContent editor={editor} className={styles.editorWrapper} />
            <EditorStatusNotice notice={notice} />
            <div ref={portalContainerRef}></div>
        </Paper>

    );
}