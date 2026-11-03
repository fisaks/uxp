import { Alert, CircularProgress, Typography } from "@mui/material";
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArtistGrid } from "./ArtistGrid";
import { useRequest } from "../shared/useRequest";
import { useRestoreScroll } from "../shared/useRestoreScroll";

const SCAN_POLL_MS = 3000;

export const ArtistsView: React.FC = () => {
    const navigate = useNavigate();
    const { data, error, reload } = useRequest("library_get_artists", {});
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
                    Scanning the music folder, {data.status.trackCount} tracks so far...
                </Alert>
            )}
            {!scanning && data.artists.length === 0 && <Typography color="text.secondary">The library is empty.</Typography>}
            <ArtistGrid
                collection="music"
                artists={data.artists}
                unit="album"
                onOpen={(artist) => navigate(`/library/artist/${artist.id}`)}
            />
        </>
    );
};
