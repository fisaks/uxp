import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import {
    Alert,
    CircularProgress,
    LinearProgress,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    ListSubheader,
    Typography,
} from "@mui/material";
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePlayerActions } from "../player/usePlayerActions";
import { ArtistGrid } from "../library/ArtistGrid";
import { useRequest } from "../shared/useRequest";
import { useRestoreScroll } from "../shared/useRestoreScroll";

const SCAN_POLL_MS = 3000;

export const AuthorsView: React.FC = () => {
    const navigate = useNavigate();
    const { playBook } = usePlayerActions();
    const { data, error, reload } = useRequest("audiobook_get_authors", {});
    const scanning = data?.status.scanning;
    useRestoreScroll(data !== undefined);

    // While a scan is running the lists grow, so they are asked for again until it is done.
    useEffect(() => {
        if (!scanning) return;
        const timer = setTimeout(reload, SCAN_POLL_MS);
        return () => clearTimeout(timer);
    }, [scanning, data, reload]);

    if (error) return <Alert severity="error">{error}</Alert>;
    if (!data) return <CircularProgress size={24} />;

    return (
        <>
            {scanning && (
                <Alert severity="info" icon={<CircularProgress size={18} />} sx={{ mb: 1 }}>
                    Scanning the audiobook folder, {data.status.trackCount} parts so far...
                </Alert>
            )}
            {!scanning && data.artists.length === 0 && <Typography color="text.secondary">There are no audiobooks.</Typography>}
            {data.continueListening.length > 0 && (
                <List
                    disablePadding
                    sx={{ mb: 2 }}
                    subheader={
                        <ListSubheader disableGutters sx={{ bgcolor: "transparent" }}>
                            Latest listened
                        </ListSubheader>
                    }
                >
                    {data.continueListening.map(({ album, artist, listenedSec, totalSec }) => (
                        <ListItemButton key={album.id} onClick={() => playBook(album.id)}>
                            <ListItemIcon sx={{ minWidth: 40 }}>
                                <PlayArrowIcon color="primary" />
                            </ListItemIcon>
                            <ListItemText
                                primary={album.title}
                                secondary={
                                    <>
                                        {artist.name}
                                        {totalSec > 0 && (
                                            <LinearProgress
                                                variant="determinate"
                                                value={Math.min(100, (100 * listenedSec) / totalSec)}
                                                sx={{ mt: 0.75 }}
                                            />
                                        )}
                                    </>
                                }
                                slotProps={{ secondary: { component: "div" } }}
                            />
                        </ListItemButton>
                    ))}
                </List>
            )}
            <ArtistGrid
                collection="audiobooks"
                artists={data.artists}
                unit="book"
                onOpen={(author) => navigate(`/audiobooks/author/${author.id}`)}
            />
        </>
    );
};
