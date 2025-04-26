import { House, HouseGetVersionResponse } from '@h2c/common';
import CloseIcon from '@mui/icons-material/Close';
import RestoreIcon from '@mui/icons-material/Restore';
import {
    Box,
    Grid2,
    IconButton,
    Tooltip,
    Typography,
    useMediaQuery,
    useTheme
} from '@mui/material';
import { AsyncContent, AsyncIconButton, useAsyncData, usePortalContainerRef } from '@uxp/ui-lib';
import { DateTime } from 'luxon';
import { useAppDispatch } from '../../../hooks';
import { useCallback, useEffect } from 'react';
import { fetchHouse, fetchHouseVersion } from '../house.api';
import { restoreHouseVersion } from '../houseThunks';
import { HousePreview } from './HousePreview';


type HousePreviewOverlayProps = {
    uuidHouse: string,
    houseVersion?: string
    onClose: () => void
    onRestore: () => void

}
export const HousePreviewOverlay = ({ uuidHouse, houseVersion, onClose, onRestore }: HousePreviewOverlayProps) => {

    const theme = useTheme();
    const dispatch = useAppDispatch();
    const portalContainerRef = usePortalContainerRef();
    const tooltipSlotProps = { popper: { container: portalContainerRef.current } }
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const asyncLoadVersion = useCallback(async (version?: string) => {

        if (version === "snapshot") {
            return fetchHouse(uuidHouse);
        } else if (version) {
            return fetchHouseVersion(uuidHouse, parseInt(version));
        }
        return undefined
    }, [uuidHouse,]);
    const { loading, error, data } = useAsyncData({ input: houseVersion, fetch: asyncLoadVersion });

    const handleClose = useCallback((e?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        e?.stopPropagation();
        e?.preventDefault();
        onClose();
    }, []);


    useEffect(() => {

        if (houseVersion) {
            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    handleClose();
                    e.stopPropagation();
                }
            };
            window.addEventListener('keydown', handleKeyDown, true);
            return () => {
                window.removeEventListener('keydown', handleKeyDown, true);
            };
        }
        return undefined;
    }, [handleClose, houseVersion]);

    const meta = data ? {
        createdAt: (data as HouseGetVersionResponse)?.createdAt,
        label: (data as HouseGetVersionResponse)?.label
    } : {}

    const handleRestore = async () => {
        if (houseVersion && houseVersion !== "snapshot") {
            return dispatch(restoreHouseVersion({ uuidHouse, version: houseVersion }))
                .unwrap()
                .then(() => {
                    onRestore();
                })
        }
    }

    if (!houseVersion) return null;

    const restoreVersionDisabled = loading || !!error || houseVersion === "snapshot"

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
                isolation: 'isolate',

            }}
        >
            <Box sx={{ px: 2, pt: 2 }}>
                {/* Row 1: Toolbar */}
                <Grid2 container alignItems="center" spacing={2}>
                    <Grid2 size={{ xs: 2 }}>
                        <AsyncIconButton onClick={handleRestore} size="small"
                            disabled={restoreVersionDisabled}
                            disabledTooltip={houseVersion === "snapshot" ? "Cannot restore snapshot version" : "Cannot restore version"}
                            tooltip="Restore This Version"
                            tooltipPortal={portalContainerRef} >
                            <RestoreIcon fontSize="small" />
                        </AsyncIconButton>
                    </Grid2>

                    <Grid2 size={{ xs: 8 }} sx={{ textAlign: 'center' }}>
                        <Typography variant="subtitle1">
                            Previewing Version {houseVersion}
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
                        {meta?.createdAt &&
                            (
                                <Typography variant="caption" color="text.secondary">
                                    {DateTime.fromISO(meta.createdAt).toFormat('d.M.yyyy HH:mm:ss')}
                                </Typography>
                            )}
                    </Grid2>

                    <Grid2 size={{ xs: 8 }} sx={{ textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary">
                            {meta?.label}
                        </Typography>
                    </Grid2>
                </Grid2>
            </Box>
            <AsyncContent loading={loading} error={error} props={{ loading: { sx: { mt: 2, mb: 4 } } }} onRetry={() => { }//</Box>load(meta.version)
            }>
                <Box id="content" sx={{ overflowY: "auto" }}>
                    <HousePreview houseSnapshot={houseVersion === "snapshot" ? data as House : undefined}
                        houseVersion={houseVersion !== "snapshot" ? data as HouseGetVersionResponse : undefined} />
                </Box>
            </AsyncContent>

        </Box>
    );
};
