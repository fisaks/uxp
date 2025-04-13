import {
    Box,
    Dialog,
    DialogContent,
    DialogTitle,
    Grid2,
    IconButton,
    Tooltip,
    Typography
} from '@mui/material';

import CloseIcon from '@mui/icons-material/Close';
import RestoreIcon from '@mui/icons-material/Restore';
import { EditorContent, useEditor } from '@tiptap/react';
import { forwardRef, useCallback, useImperativeHandle, useState } from 'react';
import * as Y from 'yjs';
import { useAsyncManualLoadWithPayload } from '../../hooks/useAsyncData';
import { AsyncContent } from '../layout/AsyncContent';
import { useRichEditorUI } from './RichEditorContext';
import { getRichEditorExtensions } from './components/useRichEditor';
import * as styles from "./RichTextEditor.module.css";
import { AsyncIconButton } from '../forms/AsyncIconButton';

export type RichEditorDiffDialogHandle = {
    open: (aVersionId: string, bVersionId: string) => void;
    close: () => void;
};
type VersionType = {
    versionId: string, label: string; yDoc: Y.Doc; createdAt?: string
}
export const RichEditorDiffDialog = forwardRef<RichEditorDiffDialogHandle>((props, ref) => {
    const [open, setOpen] = useState(false);
    const [versionA, setVersionA] = useState<VersionType | undefined>(undefined);
    const [versionB, setVersionB] = useState<VersionType | undefined>(undefined);
    const [versionIds, setVersionIds] = useState<string[]>(["", ""]);

    const { loadVersion, imageBasePath, restoreVersion, portalContainerRef, historyDrawerRef } = useRichEditorUI();

    const asyncLoadVersion = useCallback(async (versionId: string) => {
        if (!loadVersion) return undefined
        return loadVersion(versionId).then((result) => {
            const { data, createdAt } = result;
            const yDoc = new Y.Doc();
            Y.applyUpdate(yDoc, data);
            return { versionId, yDoc, label: `Version ${result.version}`, createdAt };
        });
    }, [loadVersion]);

    const loaderA = useAsyncManualLoadWithPayload(asyncLoadVersion);

    const loaderB = useAsyncManualLoadWithPayload(asyncLoadVersion);


    useImperativeHandle(ref, () => ({
        open: (aVersionId, bVersionId) => {
            setVersionIds([aVersionId, bVersionId]);
            setOpen(true);
            loaderA.load(aVersionId).then(setVersionA)
            loaderB.load(bVersionId).then(setVersionB)
        },
        close: handleClose,
    }), [loaderA, loaderB]);

    const handleClose = useCallback(() => {
        setOpen(false);
        setVersionA(undefined);
        setVersionB(undefined);
        setVersionIds(["", ""]);
    }, []);
    const editorA = useEditor({
        editable: false,
        extensions: getRichEditorExtensions({
            yDoc: versionA?.yDoc,
            basePath: imageBasePath,
            forPreview: true,
        }),
    }, [versionA, imageBasePath]);
    const editorB = useEditor({
        editable: false,
        extensions: getRichEditorExtensions({
            yDoc: versionB?.yDoc,
            basePath: imageBasePath,
            forPreview: true,
        }),
    }, [versionB, imageBasePath]);

    const handleRestore = useCallback(async (versionId: string) => {
        if (!restoreVersion) return;

        return restoreVersion(versionId).then((d) => {
            handleClose();
            historyDrawerRef.current?.close();
            return d;
        })
    }, [handleClose, restoreVersion]);

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="xl" fullWidth container={portalContainerRef.current}
            PaperProps={{
                sx: {
                    height: 'calc(100% - 64px)',
                    m: 4,
                    pb: 2
                }
            }}
        >
            <DialogTitle sx={{ position: 'sticky', top: 0, zIndex: 2, bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6" textAlign="center">
                    Compare Versions
                </Typography>
                <IconButton
                    onClick={handleClose}
                    size="small"
                    sx={{ position: 'absolute', right: 8, top: 8 }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>

                <Grid2 container spacing={2}>
                    {[
                        { versionId: versionIds[0], version: versionA, editor: editorA, loader: loaderA, setVersion: setVersionA },
                        { versionId: versionIds[1], version: versionB, editor: editorB, loader: loaderB, setVersion: setVersionB }
                    ].map(({ versionId, version, editor, loader, setVersion }, i) => (

                        <Grid2 key={i} size={{ xs: 12, md: 6 }}>
                            <Box sx={{
                                display: 'flex', justifyContent: 'space-between',
                                alignItems: 'center', mb: 1, position: 'sticky', top: 0,
                                zIndex: 1, bgcolor: 'background.paper', boxShadow: 1
                            }}>

                                <Box>
                                    <Typography variant="subtitle2">{version?.label ?? `Version ${versionId}`}</Typography>

                                    <Typography variant="caption" color="text.secondary">
                                        {version?.createdAt ?? "?"}
                                    </Typography>

                                </Box>

                                <AsyncIconButton
                                    size="small"
                                    tooltip="Restore This Version"
                                    disabledTooltip={versionId === "snapshot" ? "Cannot restore snapshot version" : "Cannot restore version"}
                                    disabled={!restoreVersion || loader.loading || !!loader.error || versionId === "snapshot"}
                                    onClick={() => handleRestore(versionId)}
                                    tooltipPortal={portalContainerRef}
                                >
                                    <RestoreIcon fontSize="small" />
                                </AsyncIconButton>

                            </Box>

                            <AsyncContent
                                loading={loader.loading}
                                error={loader.error}
                                onRetry={() => {
                                    loader.load(versionId).then(setVersion)
                                }}
                                props={{ loading: { sx: { mt: 2, mb: 4 } } }}
                            >
                                <Box sx={{
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    flex: 1, minHeight: 0,
                                    overflow: 'auto'
                                }}
                                    className={`${styles.editorContainer} `}
                                >
                                    <EditorContent
                                        editor={editor}
                                        className={styles.editorWrapper}
                                    />
                                </Box>
                            </AsyncContent>
                        </Grid2>
                    ))}
                </Grid2>

            </DialogContent>
        </Dialog >
    );
});
