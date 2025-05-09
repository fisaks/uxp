import { Box, Button, Drawer, Grid2, Link, List, ListItem, Radio, Toolbar, Typography, useMediaQuery, useTheme } from "@mui/material";
import { DateTime } from "luxon";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { useAsyncManualLoad } from "../../hooks/useAsyncData";
import { AsyncContent } from "../layout/AsyncContent";
import { useRichEditorUI } from "./RichEditorContext";

export type RichEditorHistoryDrawerHandle = {
    open: () => void;
    close: () => void;
};

export const RichEditorHistoryDrawer = forwardRef<RichEditorHistoryDrawerHandle>((props, ref) => {
    const [open, setOpen] = useState(false);
    const { loadVersion, previewOverlayRef, portalContainerRef, loadHistory, diffDialogRef, propEditable, setEditable } = useRichEditorUI()
    const [diffA, setDiffA] = useState<string | undefined>(undefined);
    const [diffB, setDiffB] = useState<string | undefined>(undefined);
    const theme = useTheme()
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const { loading, error, data, load } = useAsyncManualLoad(loadHistory)
    const handleClose = () => setOpen(false);

    useEffect(() => {
        if (open) {
            setEditable(false);
            return () => {
                setEditable(propEditable);
            }
        }
        return;
    }, [propEditable, open])
    useImperativeHandle(ref, () => ({
        open: () => {
            load();
            setOpen(true);
        },
        close: () => {
            setOpen(false);

        }
    }));
    useEffect(() => {
        if (!open) {
            setDiffA(undefined);
            setDiffB(undefined);
        }
    }, [open])

    const handlePreview = (version: string) => {
        if (!loadVersion || !data) return;
        const { documentId, documentName, } = data;
        previewOverlayRef.current?.open({ documentId, documentName, version });
    }
    const handleDiff = () => {
        if (!diffA || !diffB) return;
        previewOverlayRef.current?.close();
        diffDialogRef.current?.open(diffA, diffB);
    }
    return (
        <Drawer anchor="right" open={open} onClose={handleClose} container={portalContainerRef.current} >
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
                        onRetry={load}>

                        <Grid2 container spacing={2} columns={{ xs: 12 }} sx={{ width: "100%", p: 2 }} >
                            <Grid2 size={{ xs: 12 }}>
                                <Typography variant="h6">History: {data?.documentName}</Typography>
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
                        {data?.snapshot && <VersionListItem version={"snapshot"} diffA={diffA} diffB={diffB} setDiffA={setDiffA} setDiffB={setDiffB} onPreview={handlePreview} isMobile={isMobile} />}

                        {data?.versions.map((v) => (<VersionListItem key={v.version} version={`${v.version}`} createdAt={v.createdAt} diffA={diffA} diffB={diffB} setDiffA={setDiffA} setDiffB={setDiffB} onPreview={handlePreview} isMobile={isMobile} />))}

                    </List>
                </Box>
            </Box>
        </Drawer >
    );
});

const VersionListItem = ({ version, createdAt, setDiffA, diffB, setDiffB, diffA, onPreview, isMobile }: {
    version: string, createdAt?: string,
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
                    <Typography variant="body2">{`${(createdAt ? DateTime.fromISO(createdAt) : DateTime.now()).toFormat('d.M.yyyy HH:mm:ss')}`}</Typography>
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