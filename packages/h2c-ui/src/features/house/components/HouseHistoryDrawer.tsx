import { House } from "@h2c/common";
import { Box, Button, Drawer, Grid2, Link, List, ListItem, Portal, Radio, Toolbar, Typography, useMediaQuery, useTheme } from "@mui/material";
import { AsyncContent, useAsyncManualLoadWithPayload, usePortalContainerRef } from "@uxp/ui-lib";
import { DateTime } from "luxon";
import { useEffect, useState } from "react";
import { fetchHouseVersions } from "../house.api";
import { HousePreviewOverlay } from "./HousePreviewOverlay";

type HouseHistoryDrawerProps = {
    onClose: () => void;
    open: boolean;
    house: House;
}

export const HouseHistoryDrawer = ({ open, onClose, house }: HouseHistoryDrawerProps) => {

    const portalContainerRef = usePortalContainerRef();
    const [diffA, setDiffA] = useState<string | undefined>(undefined);
    const [diffB, setDiffB] = useState<string | undefined>(undefined);
    const [previewVersion, setPreviewVersion] = useState<string | undefined>(undefined);
    const theme = useTheme()
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const { loading, error, data, load } = useAsyncManualLoadWithPayload(fetchHouseVersions);

    useEffect(() => {
        if (!open) {
            setDiffA(undefined);
            setDiffB(undefined);
        }
        if (open) {
            load(house.uuid);
        }
    }, [open, house])
    const onRetry = () => {
        load(house.uuid);

    }

    const handleDiff = () => {

    }
    return (
        <Drawer anchor="right" open={open} onClose={onClose} container={portalContainerRef.current} >
            <Box sx={{ p: 2, minWidth: "300px" }}>
                <Box sx={{
                    position: 'sticky',
                    top: 0,
                    m: -2,
                    backgroundColor: theme.palette.background.paper,
                    zIndex: 100,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                }}>
                    <Toolbar />
                    <AsyncContent
                        loading={loading}
                        error={error}
                        props={{ loading: { sx: { mt: 4, mb: 2 } } }}
                        onRetry={onRetry}>

                        <Grid2 container spacing={2} columns={{ xs: 12 }} sx={{ width: "100%", p: 2 }} >
                            <Grid2 size={{ xs: 12 }}>
                                <Typography variant="h6">History: {house.name}</Typography>
                            </Grid2>
                            {!isMobile && <>
                                <Grid2 size={{ xs: 8 }} sx={{ display: "flex", alignItems: "center", justifyContent: "right" }} >
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        disabled={!diffA || !diffB}
                                        onClick={handleDiff}
                                    >
                                        Diff
                                    </Button>
                                </Grid2>
                                <Grid2 size={{ xs: 2 }} sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <Typography variant="caption" fontWeight="bold" fontSize="0.875rem">A</Typography>
                                </Grid2>
                                <Grid2 size={{ xs: 2 }} sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <Typography variant="caption" fontWeight="bold" fontSize="0.875rem">B</Typography>
                                </Grid2>
                            </>}
                        </Grid2>
                    </AsyncContent>
                </Box>
                <Box sx={{ mb: 2 }} >
                    <List >
                        <VersionListItem version={"snapshot"} diffA={diffA} diffB={diffB} setDiffA={setDiffA} setDiffB={setDiffB} onPreview={setPreviewVersion} isMobile={isMobile} />

                        {data?.map((v) => (<VersionListItem key={v.version} version={`${v.version}`} label={v.label} createdAt={v.createdAt} diffA={diffA} diffB={diffB} setDiffA={setDiffA} setDiffB={setDiffB} onPreview={setPreviewVersion} isMobile={isMobile} />))}

                    </List>
                </Box>
            </Box>
            <Portal container={portalContainerRef.current}>
                <HousePreviewOverlay uuidHouse={house.uuid} houseVersion={previewVersion} onClose={() => { setPreviewVersion(undefined) }}
                    onRestore={() => {
                        setPreviewVersion(undefined);
                        onClose();
                    }} />
            </Portal>
        </Drawer >
    );
};

const VersionListItem = ({ version, label, createdAt, setDiffA, diffB, setDiffB, diffA, onPreview, isMobile }: {
    version: string, label?: string, createdAt?: string,
    diffA?: string, setDiffA: (a: string | undefined) => void
    diffB?: string, setDiffB: (a: string | undefined) => void,
    onPreview: (version: string) => void,
    isMobile?: boolean
}) => {
    return (
        <ListItem sx={{ pl: 0, pr: 0 }}>
            <Grid2 container spacing={2} columns={{ xs: 12 }} sx={{ width: "100%" }} >
                <Grid2 size={{ xs: 8 }}>
                    <Link onClick={() => onPreview(version)}>
                        Version {version}
                    </Link>
                    {label && (<><br /><Typography variant="caption" color="text.secondary">{label}</Typography></>)}
                    <Typography variant="body2" color="text.secondary">{`${(createdAt ? DateTime.fromISO(createdAt) : DateTime.now()).toFormat('d.M.yyyy HH:mm:ss')}`}</Typography>
                </Grid2>
                {!isMobile && <>
                    <Grid2 size={{ xs: 2 }} sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Radio
                            checked={diffA === version}
                            onClick={() => {
                                diffB !== version && setDiffA(diffA === version ? undefined : version);
                            }}

                            inputProps={{ 'aria-label': `Select A for version ${version}` }}
                        />
                    </Grid2>
                    <Grid2 size={{ xs: 2 }} sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Radio
                            checked={diffB === version}
                            onClick={() => {
                                diffA !== version && setDiffB(diffB === version ? undefined : version);
                            }}

                            inputProps={{ 'aria-label': `Select B for version ${version}` }}
                        />
                    </Grid2>
                </>
                }
            </Grid2>
        </ListItem >

    );
}