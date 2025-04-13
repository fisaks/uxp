import CloseIcon from '@mui/icons-material/Close';
import RestoreIcon from '@mui/icons-material/Restore';
import {
    Box,
    Grid2,
    IconButton,
    Paper,
    Tooltip,
    Typography,
    useMediaQuery,
    useTheme
} from '@mui/material';
import { EditorContent, useEditor } from '@tiptap/react';
import { DateTime } from 'luxon';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import * as Y from 'yjs';
import { useAsyncManualLoadWithPayload } from '../../hooks/useAsyncData';
import { AsyncIconButton } from '../forms/AsyncIconButton';
import { AsyncContent } from '../layout/AsyncContent';
import { getRichEditorExtensions } from './components/useRichEditor';
import { useRichEditorUI } from './RichEditorContext';
import * as styles from "./RichTextEditor.module.css";

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
    close: () => void;
};

export const RichEditorPreviewOverlay = forwardRef<RichEditorPreviewOverlayHandler>((_, ref) => {
    const [yDoc, setYDoc] = useState<Y.Doc | undefined>(undefined);
    const [meta, setMeta] = useState<DocumentPreviewMeta | undefined>(undefined);

    const theme = useTheme();
    const { imageBasePath, loadVersion, portalContainerRef, restoreVersion, historyDrawerRef } = useRichEditorUI();
    const tooltipSlotProps = { popper: { container: portalContainerRef.current } }
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
        close: () => {
            handleClose();
        }
    }), [load]);

    useEffect(() => {
        const handler = (e: PopStateEvent) => {
            if (meta) setMeta(undefined);
            if (yDoc) setYDoc(undefined);
        };
        window.addEventListener('popstate', handler);
        return () => window.removeEventListener('popstate', handler);
    }, [meta, yDoc]);

    const handleClose = useCallback(() => {
        if (meta) setMeta(undefined);
        if (yDoc) setYDoc(undefined);
    }, [meta, yDoc]);


    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !!meta) {
                handleClose();
                e.stopPropagation();
            }
        };
        window.addEventListener('keydown', handleKeyDown, true);
        return () => {
            window.removeEventListener('keydown', handleKeyDown, true);
        };
    }, [handleClose]);

    const editor = useEditor({
        editable: false,
        extensions: getRichEditorExtensions({
            yDoc: yDoc,
            basePath: imageBasePath,
            forPreview: true,
        }),
    }, [yDoc, imageBasePath]);

    const handleRestore = async () => {
        if (!restoreVersion || !meta?.version) return;

        return restoreVersion(meta.version).then((d) => {
            handleClose();
            historyDrawerRef.current?.close();
            return d;
        })
    }

    if (!meta) return null;

    const restoreVersionDisabled = !restoreVersion || loading || !!error || meta.version === "snapshot"

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
            <Box sx={{ px: 2, pt: 2 }}>
                {/* Row 1: Toolbar */}
                <Grid2 container alignItems="center" spacing={2}>
                    <Grid2 size={{ xs: 2 }}>
                        <AsyncIconButton onClick={handleRestore} size="small"
                            disabled={restoreVersionDisabled}
                            disabledTooltip={meta.version === "snapshot" ? "Cannot restore snapshot version" : "Cannot restore version"}
                            tooltip="Restore This Version"
                            tooltipPortal={portalContainerRef} >
                            <RestoreIcon fontSize="small" />
                        </AsyncIconButton>
                    </Grid2>

                    <Grid2 size={{ xs: 8 }} sx={{ textAlign: 'center' }}>
                        <Typography variant="subtitle1">
                            Previewing Version {meta.version}
                        </Typography>
                    </Grid2>

                    <Grid2 size={{ xs: 2 }} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Tooltip title="Close Version Window" slotProps={tooltipSlotProps}>
                            <IconButton onClick={handleClose} size="small">
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Grid2>
                </Grid2>

                {/* Row 2: Metadata */}
                <Grid2 container alignItems="center" sx={{ mt: 1 }}>
                    <Grid2 size={{ xs: 2 }}>
                        {meta.createdAt && (
                            <Typography variant="caption" color="text.secondary">
                                {DateTime.fromISO(meta.createdAt).toFormat('d.M.yyyy HH:mm:ss')}
                            </Typography>
                        )}
                    </Grid2>

                    <Grid2 size={{ xs: 8 }} sx={{ textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary">
                            {meta.documentName}
                        </Typography>
                    </Grid2>
                </Grid2>
            </Box>
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
