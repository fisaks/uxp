import { Box, Paper, Typography, useTheme } from "@mui/material";
import { EditorContent } from "@tiptap/react";
import { useRichEditorUI } from "./RichEditorContext";
import * as styles from "./RichTextEditor.module.css";
import { EditorStatusNotice } from "./components/EditorStatusNotice";
import { FloatingImageToolbar } from "./components/FloatingImageToolbar";
import { LinkEdit } from "./components/LinkEdit";
import { MoreMenu } from "./components/MoreMenu";
import { RichEditorToolbar } from "./components/RichEditorToolbar";
import { RichEditorUploadManager } from "./components/RichEditorUploadManager";
import { useRichEditor } from "./components/useRichEditor";


export const RichTextEditorContent = () => {
    const { editor, editorRootContainerRef, portalContainerRef, isFullScreen, label, editable, notice, hideMenu } = useRichEditorUI();
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

            {!hideMenu &&
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        px: 1,
                        pt: 1,
                        minHeight: 32, // optional, keeps row height consistent even without label
                        '@media print': { display: 'none' }
                    }}
                >
                    {label ? (
                        <Typography variant="caption" color="text.secondary" sx={{ pl: "10px" }}>
                            {label}
                        </Typography>) : (
                        <Box />
                    )}
                    <MoreMenu />
                </Box>
            }
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