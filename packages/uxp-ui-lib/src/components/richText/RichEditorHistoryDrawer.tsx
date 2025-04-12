import { Box, Button, Drawer, Grid2, Link, List, ListItem, Radio, Toolbar, Typography, useTheme } from "@mui/material";
import { DateTime } from "luxon";
import { forwardRef, useImperativeHandle, useState } from "react";
import { useAsyncManualLoad } from "../../hooks/useAsyncData";
import { AsyncContent } from "../layout/AsyncContent";
import { useRichEditorUI } from "./RichEditorContext";

export type RichEditorHistoryDrawerHandle = {
    open: () => void;
};

export const RichEditorHistoryDrawer = forwardRef<RichEditorHistoryDrawerHandle>((props, ref) => {
    const [open, setOpen] = useState(false);
    const { loadVersion, previewOverlayRef, portalContainerRef, loadHistory } = useRichEditorUI()
    const [diffA, setDiffA] = useState<string | undefined>(undefined);
    const [diffB, setDiffB] = useState<string | undefined>(undefined);
    const theme = useTheme()
    const { loading, error, data, load } = useAsyncManualLoad(loadHistory)
    const handleClose = () => setOpen(false);

    useImperativeHandle(ref, () => ({
        open: () => {
            load();
            setOpen(true);
        },
    }));

    const handlePreview = (version: string) => {
        if (!loadVersion || !data) return;
        const { documentId, documentName, } = data;
        previewOverlayRef.current?.open({ documentId, documentName, version });
    }

    return (
        <Drawer anchor="right" open={open} onClose={handleClose} container={portalContainerRef.current}  >
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
                            <Grid2 size={{ xs: 8 }} sx={{ display: "flex", alignItems: "center", justifyContent: "right" }} >
                                <Button
                                    variant="outlined"
                                    size="small"
                                //disabled={!diffA || !diffB || diffA === diffB}
                                //onClick={() => onDiff(diffA!, diffB!)}
                                >
                                    Diff
                                </Button>
                            </Grid2>
                            <Grid2 size={{ xs: 2 }} sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Typography variant="caption" >A</Typography>
                            </Grid2>
                            <Grid2 size={{ xs: 2 }} sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Typography variant="caption" >B</Typography>
                            </Grid2>

                        </Grid2>
                    </AsyncContent>
                </Box>
                <Box sx={{ mb: 2 }} >
                    <List >
                        {data?.snapshot && <VersionListItem version={"snapshot"} diffA={diffA} diffB={diffB} setDiffA={setDiffA} setDiffB={setDiffB} onPreview={handlePreview} />}

                        {data?.versions.map((v) => (<VersionListItem version={`${v.version}`} createdAt={v.createdAt} diffA={diffA} diffB={diffB} setDiffA={setDiffA} setDiffB={setDiffB} onPreview={handlePreview} />))}

                    </List>
                </Box>
            </Box>
        </Drawer >
    );
});

const VersionListItem = ({ version, createdAt, setDiffA, diffB, setDiffB, diffA, onPreview }: {
    version: string, createdAt?: string,
    diffA?: string, setDiffA: (a: string | undefined) => void
    diffB?: string, setDiffB: (a: string | undefined) => void,
    onPreview: (version: string) => void
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
                <Grid2 size={{ xs: 2 }} sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Radio
                        checked={diffA === `${version}`}
                        onChange={() => setDiffA(`${version}`)}
                        inputProps={{ 'aria-label': `Select A for version ${version}` }}
                    />
                </Grid2>
                <Grid2 size={{ xs: 2 }} sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Radio
                        checked={diffB === `${version}`}
                        onChange={() => setDiffB(`${version}`)}
                        inputProps={{ 'aria-label': `Select B for version ${version}` }}
                    />
                </Grid2>
            </Grid2>
        </ListItem >

    );
}