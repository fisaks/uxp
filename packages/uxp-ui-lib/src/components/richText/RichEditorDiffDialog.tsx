import {
    Box,
    Dialog,
    DialogContent,
    DialogTitle,
    Grid2,
    IconButton,
    Radio,
    Typography
} from '@mui/material';

import CloseIcon from '@mui/icons-material/Close';
import RestoreIcon from '@mui/icons-material/Restore';
import { Editor, EditorContent, JSONContent, useEditor } from '@tiptap/react';
import { DateTime } from 'luxon';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import * as Y from 'yjs';
import { useAsyncManualLoadWithPayload } from '../../hooks/useAsyncData';
import { AsyncIconButton } from '../forms/AsyncIconButton';
import { AsyncContent } from '../layout/AsyncContent';
import { getRichEditorExtensions } from './components/useRichEditor';
import { DiffMark } from './extensions/DiffMark';
import { DiffWrapper } from './extensions/DiffWrapper';
import { useRichEditorUI } from './RichEditorContext';
import * as styles from "./RichTextEditor.module.css";
import { generateRichTextDiffFromJson } from './utils/richEditorDiffHelper';

export type RichEditorDiffDialogHandle = {
    open: (aVersionId: string, bVersionId: string) => void;
    close: () => void;
};
type DocumentVersionType = {
    versionId: string, label: string; yDoc: Y.Doc; createdAt?: string, editor?: Editor, originalJson?: JSONContent
}

export const RichEditorDiffDialog = forwardRef<RichEditorDiffDialogHandle>((props, ref) => {
    const [open, setOpen] = useState(false);
    const [versionA, setVersionA] = useState<DocumentVersionType | undefined>(undefined);
    const [versionB, setVersionB] = useState<DocumentVersionType | undefined>(undefined);
    const [versionIds, setVersionIds] = useState<string[]>(["", ""]);
    const [wordDiff, setWordDiff] = useState(false);
    const [showDiff, setShowDiff] = useState(true);

    const { loadVersion, imageBasePath, restoreVersion, portalContainerRef, historyDrawerRef } = useRichEditorUI();

    const asyncLoadVersion = useCallback(async (versionId: string) => {
        if (!loadVersion) return undefined
        return loadVersion(versionId).then((result) => {
            const { data, createdAt } = result;
            const yDoc = new Y.Doc();
            Y.applyUpdate(yDoc, data);
            return { versionId, label: `Version ${result.version}`, createdAt, yDoc };
        });
    }, [loadVersion, imageBasePath]);

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
        extensions: [...getRichEditorExtensions({
            basePath: imageBasePath,
            yDoc: versionA?.yDoc,
        }), DiffMark, DiffWrapper],
        onCreate: ({ editor }) => {
            console.info("[RichEditorDiffDialog] Editor A Created",);
            setVersionA((prev) => {
                if (prev) {
                    return { ...prev, originalJson: editor.getJSON(), editor }
                }
                return prev;
            })
        }

    }, [versionA?.yDoc]);
    const editorB = useEditor({
        editable: false,
        extensions: [...getRichEditorExtensions({
            basePath: imageBasePath,
            yDoc: versionB?.yDoc,
        }), DiffMark, DiffWrapper],
        onCreate: ({ editor }) => {
            console.info("[RichEditorDiffDialog] Editor B Created");
            setVersionB((prev) => {
                if (prev) {
                    return { ...prev, originalJson: editor.getJSON(), editor }
                }
                return prev;
            })
        }
    }, [versionB?.yDoc]);

    useEffect(() => {
        if (versionA?.originalJson && versionB?.originalJson) {
            if (!showDiff) {
                versionA.editor?.commands.setContent(versionA.originalJson);
                versionB.editor?.commands.setContent(versionB.originalJson);
                return;
            }

            const diff = generateRichTextDiffFromJson(
                versionA.originalJson, versionB?.originalJson, wordDiff);
            console.log("[RichEditorDiffDialog] A Doc", versionA.originalJson);
            console.log("[RichEditorDiffDialog] B Doc", versionB.originalJson);
            console.log("[RichEditorDiffDialog] diff", diff);
            versionA.editor?.commands.setContent(diff.a);
            versionB.editor?.commands.setContent(diff.b);
        }

    }, [versionA, versionB, wordDiff, showDiff]);

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
            <DialogTitle sx={{
                position: 'sticky', top: 0, zIndex: 2,
                bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider',

            }}>
                <Grid2 container alignItems="center" justifyContent="space-between">
                    <Grid2 size={{ xs: 4 }} >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, }}>
                            <Box component="span" sx={{ fontSize: '0.75rem', opacity: 0.7 }}>Legend:</Box>
                            <Box component="span" className={styles.diffLegendModified}>Modified</Box>
                            <Box component="span" className={styles.diffLegendAdded}>Added</Box>
                            <Box component="span" className={styles.diffLegendRemoved}>Removed</Box>
                        </Box>
                    </Grid2>
                    <Grid2 size={{ xs: 4 }}>
                        <Typography variant="h6" sx={{ textAlign: 'center' }}>
                            Compare Versions
                        </Typography>
                    </Grid2>
                    <Grid2 size={{ xs: 4 }}>
                        <Radio checked={wordDiff} onClick={() => setWordDiff(!wordDiff)} />Word Diff
                        <Radio checked={showDiff} onClick={() => setShowDiff(!showDiff)} />Show Diff
                    </Grid2>
                </Grid2>
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
                        { versionId: versionIds[0], version: versionA, loader: loaderA, setVersion: setVersionA, editor: editorA },
                        { versionId: versionIds[1], version: versionB, loader: loaderB, setVersion: setVersionB, editor: editorB }
                    ].map(({ versionId, version, loader, setVersion, editor }, i) => (

                        <Grid2 key={i} size={{ xs: 12, md: 6 }} >
                            <Box sx={{
                                display: 'flex', justifyContent: 'space-between',
                                alignItems: 'center', mb: 1, position: 'sticky', top: 0,
                                zIndex: 1, bgcolor: 'background.paper', boxShadow: 1, ml: i === 0 ? "-24px" : "-8px", mr: i === 1 ? "-24px" : "-8px"
                            }}>

                                <Box sx={{ pl: i === 0 ? "24px" : "8px" }}>
                                    <Typography variant="subtitle2">{version?.label ?? `Version ${versionId}`}</Typography>

                                    <Typography variant="caption" color="text.secondary">
                                        {version?.createdAt ? DateTime.fromISO(version.createdAt).toFormat('d.M.yyyy HH:mm:ss') : "?"}
                                    </Typography>

                                </Box>

                                <AsyncIconButton
                                    size="small"
                                    tooltip="Restore This Version"
                                    disabledTooltip={versionId === "snapshot" ? "Cannot restore snapshot version" : "Cannot restore version"}
                                    disabled={!restoreVersion || loader.loading || !!loader.error || versionId === "snapshot"}
                                    onClick={() => handleRestore(versionId)}
                                    tooltipPortal={portalContainerRef}
                                    sx={{ pr: i === 0 ? "16px" : "24px" }}
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

                                    <EditorContent editor={editor} className={styles.editorWrapper} />
                                </Box>
                            </AsyncContent>
                        </Grid2>
                    ))}
                </Grid2>

            </DialogContent>
        </Dialog >
    );
});
