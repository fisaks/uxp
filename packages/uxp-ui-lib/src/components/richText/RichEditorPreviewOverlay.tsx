import CloseIcon from '@mui/icons-material/Close';
import {
    Box,
    Button,
    IconButton,
    Paper,
    Typography,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import { EditorContent, useEditor } from '@tiptap/react';
import { DateTime } from 'luxon';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import * as Y from 'yjs';
import { useAsyncManualLoadWithPayload } from '../../hooks/useAsyncData';
import { getRichEditorExtensions } from './components/useRichEditor';
import { DocumentVersion, useRichEditorUI } from './RichEditorContext';
import * as styles from "./RichTextEditor.module.css";
import { AsyncContent } from '../layout/AsyncContent';

export type DocumentPreviewMeta = {
    version: string;
    createdAt?: string;
    documentId: string;
    documentName: string;
    deleted?: boolean;
    removedAt?: string;
}

export type RichEditorPreviewOverlayHandler = {
    open: (meta: DocumentPreviewMeta) => void;
};

export const RichEditorPreviewOverlay = forwardRef<RichEditorPreviewOverlayHandler>((_, ref) => {
    const [yDoc, setYDoc] = useState<Y.Doc | undefined>(undefined);
    const [meta, setMeta] = useState<DocumentPreviewMeta | undefined>(undefined);

    const theme = useTheme();
    const { imageBasePath, loadVersion } = useRichEditorUI();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const asyncLoadVersion = useCallback(async (version: string) => {
        if (!loadVersion) return;
        return loadVersion(version).then((result) => {
            const { data, createdAt, name, deleted, removedAt } = result;
            const yDoc = new Y.Doc();
            Y.applyUpdate(yDoc, data);
            setYDoc(yDoc);
            setMeta((prev) => (prev ? { ...prev, version, createdAt, documentName: name ?? "", deleted, removedAt } : undefined));

            return result;
        })
    }, [loadVersion]);
    const { loading, error, load } = useAsyncManualLoadWithPayload(asyncLoadVersion);
    useImperativeHandle(ref, () => ({
        open: (meta) => {
            setYDoc(undefined);
            setMeta(meta);
            load(meta.version);
            window.history.pushState({ previewOpen: true }, '');
        },
    }), [load]);

    useEffect(() => {
        const handler = (e: PopStateEvent) => {
            if (meta) setMeta(undefined);
            if (yDoc) setYDoc(undefined);
        };
        window.addEventListener('popstate', handler);
        return () => window.removeEventListener('popstate', handler);
    }, [meta, yDoc]);

    const editor = useEditor({
        editable: false,
        extensions: getRichEditorExtensions({
            yDoc: yDoc,
            basePath: imageBasePath,
            forPreview: true,
        }),
    }, [yDoc, imageBasePath]);

    const handleClose = () => {
        if (meta) setMeta(undefined);
        if (yDoc) setYDoc(undefined);
    }

    if (!meta) return null;

    return (
        <Box
            sx={{
                position: 'fixed',
                top: isMobile ? 0 : '32px',
                right: isMobile ? 0 : 325, // drawer width
                maxHeight: isMobile ? '100%' : 'calc(100% - 67px)',
                width: isMobile ? '100%' : 'calc(100vw - 350px)', // fill space left of drawer
                maxWidth: '100vw',
                minWidth: 400, // optional: don't go too narrow
                zIndex: 1300,
                backgroundColor: theme.palette.background.paper,
                boxShadow: 3,
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
                <Typography variant="subtitle1">Previewing Version {meta.version}</Typography>
                <Button
                    variant="contained"
                    onClick={async () => {
                        //await state.onRestore();
                        handleClose();
                    }}
                >
                    Restore This Version
                </Button>
                <IconButton onClick={handleClose} size="small">
                    <CloseIcon fontSize="small" />
                </IconButton>
            </Box>

            {meta.createdAt && (
                <Typography variant="caption" sx={{ px: 2 }} color="text.secondary">
                    {DateTime.fromISO(meta.createdAt).toFormat('d.M.yyyy HH:mm:ss')}
                </Typography>
            )}

            <AsyncContent loading={loading} error={error} props={{ loading: { sx: { mt: 2, mb: 4 } } }} onRetry={() => load(meta.version)}>
                <Paper elevation={3} sx={{ margin: 1, overflow: 'auto' }}
                    className={`${styles.editorContainer} `}>

                    <Box sx={{ flex: 1, px: 2, my: 2 }}>
                        <EditorContent editor={editor} className={styles.editorWrapper} />
                    </Box>
                </Paper>
            </AsyncContent>

        </Box>
    );
});
