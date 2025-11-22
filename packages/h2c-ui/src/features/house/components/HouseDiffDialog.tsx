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

import { BuildingDataVersion, House, HouseDataVersion, HouseGetVersionResponse } from '@h2c/common';
import CloseIcon from '@mui/icons-material/Close';
import RestoreIcon from '@mui/icons-material/Restore';
import { Editor, JSONContent } from '@tiptap/react';
import { AsyncContent, AsyncIconButton, useAsyncManualLoadWithPayload, usePortalContainerRef } from '@uxp/ui-lib';
import { useCallback, useEffect, useState } from 'react';
import * as Y from 'yjs';
import { useAppDispatch } from '../../../hooks';
import { fetchHouse, fetchHouseVersion } from '../house.api';
import { fetchHouseVersionForDiff, restoreHouseVersion } from '../houseThunks';
import { HousePreview } from './HousePreview';
import { useSelector } from 'react-redux';
import { selectHouseDiffData, selectHouseDiffError, selectHouseDiffLoading } from '../houseSelectors';
import { create } from 'domain';


export type RichEditorDiffDialogHandle = {
    open: (aVersionId: string, bVersionId: string) => void;
    close: () => void;
};
type DocumentVersionType = {
    versionId: string, label: string; yDoc: Y.Doc; createdAt?: string, editor?: Editor, originalJson?: JSONContent
}
type HouseDiffDialogProps = {
    uuidHouse: string,
    aVersionId?: string;
    bVersionId?: string;
    open: boolean
    onClose: () => void;
    onRestore: (versionId: string) => void;
}

type DiffKey = {
    key: string;
    diff: "modified" | "added" | "removed";
}

type HouseDiffData = {
    uuid: string
    versionId: string;
    label: string;
    createdAt?: string;
    data: Omit<HouseDataVersion, "buildings" | "documentVersion"> & {
        document: JSONContent
        diff: DiffKey[],
        buildings: (BuildingDataVersion & {
            document: JSONContent
            diff: DiffKey[]
        })[]
    }
}
export const HouseDiffDialog = ({ open, uuidHouse, aVersionId, bVersionId, onClose, onRestore }: HouseDiffDialogProps) => {
    const dispatch = useAppDispatch();

    const [wordDiff, setWordDiff] = useState(false);
    const [showDiff, setShowDiff] = useState(true);
    const loading = useSelector(selectHouseDiffLoading);
    const error = useSelector(selectHouseDiffError);
    const diffData = useSelector(selectHouseDiffData);
    const portalContainerRef = usePortalContainerRef();

    const handleClose = useCallback(() => {
        onClose();
    }, []);

    const loadHouseDiff = () => {
        if (!!aVersionId && !!bVersionId) {
            dispatch(fetchHouseVersionForDiff({
                uuidHouse,
                versionA: aVersionId,
                versionB: bVersionId
            }))
        }
    }
    useEffect(() => {

        if (open && !!aVersionId && !!bVersionId) {
            dispatch(fetchHouseVersionForDiff({
                uuidHouse,
                versionA: aVersionId,
                versionB: bVersionId
            }))
        }

    }, [aVersionId, bVersionId, open]);




    const handleRestore = useCallback(async (versionId: number) => {
        if (versionId && versionId !== 0) {
            return dispatch(restoreHouseVersion({ uuidHouse, version: `${versionId}` }))
                .unwrap()
                .then(() => {
                    onRestore(`${versionId}`);
                })
        }
    }, [uuidHouse, onRestore, dispatch]);

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
                        { versionId: diffData?.a.version, version: diffData?.a.label, createdAt: diffData?.a.createdAt, data: diffData?.a },
                        { versionId: diffData?.b.version, version: diffData?.b.label, createdAt: diffData?.b.createdAt, data: diffData?.b }
                    ].map(({ versionId, version, createdAt, data }, i) => (

                        <Grid2 key={i} size={{ xs: 12, md: 6 }} >
                            <Box sx={{
                                display: 'flex', justifyContent: 'space-between',
                                alignItems: 'center', mb: 1, position: 'sticky', top: 0,
                                zIndex: 1, bgcolor: 'background.paper', boxShadow: 1, ml: i === 0 ? "-24px" : "-8px", mr: i === 1 ? "-24px" : "-8px"
                            }}>

                                <Box sx={{ pl: i === 0 ? "24px" : "8px" }}>
                                    <Typography variant="subtitle2">
                                        {
                                            version}
                                    </Typography>

                                    <Typography variant="caption" color="text.secondary">
                                        {
                                            createdAt
                                        }
                                    </Typography>

                                </Box>

                                <AsyncIconButton
                                    size="small"
                                    tooltip="Restore This Version"
                                    disabledTooltip={versionId === 0 ? "Cannot restore snapshot version" : "Cannot restore version"}
                                    disabled={loading || !!error || versionId === 0}
                                    onClick={() => handleRestore(versionId!)}
                                    tooltipPortal={portalContainerRef}
                                    sx={{ pr: i === 0 ? "16px" : "24px" }}
                                >
                                    <RestoreIcon fontSize="small" />
                                </AsyncIconButton>

                            </Box>

                            <AsyncContent
                                loading={loading}
                                error={error ? "Error" : undefined}
                                onRetry={() => {
                                    loadHouseDiff();
                                }}
                                props={{ loading: { sx: { mt: 2, mb: 4 } } }}
                            >
                                <HousePreview houseVersion={data}
                                />
                            </AsyncContent>
                        </Grid2>
                    ))}
                </Grid2>


            </DialogContent>
        </Dialog >
    );
};
