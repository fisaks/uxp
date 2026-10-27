import RefreshIcon from "@mui/icons-material/Refresh";
import {
    Alert,
    Box,
    CircularProgress,
    IconButton,
    List,
    ListItemButton,
    ListItemText,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAudioWebSocket } from "../../app/AudioBrowserWebSocketManager";
import { LibraryBreadcrumbs } from "./LibraryBreadcrumbs";
import { useLibraryRequest } from "./useLibraryRequest";

const SCAN_POLL_MS = 3000;

export const ArtistsView: React.FC = () => {
    const navigate = useNavigate();
    const { sendMessageAsync } = useAudioWebSocket();
    const { data, error, reload } = useLibraryRequest("library_get_artists", {});
    const [filter, setFilter] = useState("");
    const scanning = data?.status.scanning;

    // While a scan is running the lists grow, so they are asked for again until it is done.
    useEffect(() => {
        if (!scanning) return;
        const timer = setTimeout(reload, SCAN_POLL_MS);
        return () => clearTimeout(timer);
    }, [scanning, data, reload]);

    const rescan = async () => {
        await sendMessageAsync("library_scan", {});
        void reload();
    };

    if (error) return <Alert severity="error">{error}</Alert>;
    if (!data) return <CircularProgress size={24} />;

    const artists = data.artists.filter((artist) => artist.name.toLowerCase().includes(filter.trim().toLowerCase()));

    return (
        <>
            <LibraryBreadcrumbs trail={[]} current="Library" />
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <TextField size="small" fullWidth placeholder="Filter artists" value={filter} onChange={(e) => setFilter(e.target.value)} />
                <Tooltip title="Scan the music folder again">
                    <span>
                        <IconButton onClick={rescan} disabled={scanning} aria-label="Scan the music folder again">
                            <RefreshIcon />
                        </IconButton>
                    </span>
                </Tooltip>
            </Stack>
            {scanning && (
                <Alert severity="info" icon={<CircularProgress size={18} />} sx={{ mb: 1 }}>
                    Scanning the music folder, {data.status.trackCount} tracks so far...
                </Alert>
            )}
            {!scanning && data.artists.length === 0 && <Typography color="text.secondary">The library is empty.</Typography>}
            <List disablePadding>
                {artists.map((artist) => (
                    <ListItemButton key={artist.id} onClick={() => navigate(`/library/artist/${artist.id}`)}>
                        <ListItemText
                            primary={artist.name}
                            secondary={`${artist.albumCount} ${artist.albumCount === 1 ? "album" : "albums"}`}
                        />
                    </ListItemButton>
                ))}
            </List>
            {data.artists.length > 0 && artists.length === 0 && (
                <Box sx={{ py: 1 }}>
                    <Typography color="text.secondary">No artist matches.</Typography>
                </Box>
            )}
        </>
    );
};
