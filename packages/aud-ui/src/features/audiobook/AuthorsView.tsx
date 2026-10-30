import RefreshIcon from "@mui/icons-material/Refresh";
import { Alert, CircularProgress, IconButton, List, ListItemButton, ListItemText, Stack, Tooltip, Typography } from "@mui/material";
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAudioWebSocket } from "../../app/AudioBrowserWebSocketManager";
import { LibraryBreadcrumbs } from "../library/LibraryBreadcrumbs";
import { useRequest } from "../shared/useRequest";

const SCAN_POLL_MS = 3000;

export const AuthorsView: React.FC = () => {
    const navigate = useNavigate();
    const { sendMessageAsync } = useAudioWebSocket();
    const { data, error, reload } = useRequest("audiobook_get_authors", {});
    const scanning = data?.status.scanning;

    // While a scan is running the lists grow, so they are asked for again until it is done.
    useEffect(() => {
        if (!scanning) return;
        const timer = setTimeout(reload, SCAN_POLL_MS);
        return () => clearTimeout(timer);
    }, [scanning, data, reload]);

    const rescan = async () => {
        await sendMessageAsync("audiobook_scan", {});
        void reload();
    };

    if (error) return <Alert severity="error">{error}</Alert>;
    if (!data) return <CircularProgress size={24} />;

    return (
        <>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <LibraryBreadcrumbs trail={[]} current="Audiobooks" />
                <Tooltip title="Scan the audiobook folder again">
                    <span>
                        <IconButton onClick={rescan} disabled={scanning} aria-label="Scan the audiobook folder again">
                            <RefreshIcon />
                        </IconButton>
                    </span>
                </Tooltip>
            </Stack>
            {scanning && (
                <Alert severity="info" icon={<CircularProgress size={18} />} sx={{ mb: 1 }}>
                    Scanning the audiobook folder, {data.status.trackCount} parts so far...
                </Alert>
            )}
            {!scanning && data.artists.length === 0 && <Typography color="text.secondary">There are no audiobooks.</Typography>}
            <List disablePadding>
                {data.artists.map((author) => (
                    <ListItemButton key={author.id} onClick={() => navigate(`/audiobooks/author/${author.id}`)}>
                        <ListItemText
                            primary={author.name}
                            secondary={`${author.albumCount} ${author.albumCount === 1 ? "book" : "books"}`}
                        />
                    </ListItemButton>
                ))}
            </List>
        </>
    );
};
