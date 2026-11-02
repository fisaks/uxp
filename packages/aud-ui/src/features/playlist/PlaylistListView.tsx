import AddIcon from "@mui/icons-material/Add";
import { Alert, Button, CircularProgress, Stack, Typography } from "@mui/material";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CoverMosaic } from "../library/CoverMosaic";
import { formatDuration } from "../library/libraryFormat";
import { Tile, TileGrid } from "../library/TileGrid";
import { useRequest } from "../shared/useRequest";
import { NamePlaylistDialog } from "./NamePlaylistDialog";
import { usePlaylistCommand } from "./usePlaylistCommand";

export const PlaylistListView: React.FC = () => {
    const navigate = useNavigate();
    const { data: playlists, error } = useRequest("playlist_list", {});
    const send = usePlaylistCommand();
    const [naming, setNaming] = useState(false);

    const create = async (name: string) => {
        setNaming(false);
        const playlist = await send("playlist_create", { name, trackIds: [] });
        if (playlist) navigate(`/playlists/${playlist.id}`);
    };

    if (error) return <Alert severity="error">{error}</Alert>;
    if (!playlists) return <CircularProgress size={24} />;

    return (
        <>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="h6">Playlists</Typography>
                <Button startIcon={<AddIcon />} onClick={() => setNaming(true)}>
                    New playlist
                </Button>
            </Stack>
            {playlists.length === 0 && (
                <Typography color="text.secondary">
                    No playlists yet. Make one here, or save the queue or an album from the Library as a playlist.
                </Typography>
            )}
            <TileGrid>
                {playlists.map((playlist) => (
                    <Tile
                        key={playlist.id}
                        picture={<CoverMosaic collection="music" albumIds={playlist.coverAlbumIds} />}
                        title={playlist.name}
                        subtitle={[
                            `${playlist.trackCount} ${playlist.trackCount === 1 ? "track" : "tracks"}`,
                            playlist.durationSec > 0 && formatDuration(playlist.durationSec),
                        ]
                            .filter(Boolean)
                            .join(" · ")}
                        onClick={() => navigate(`/playlists/${playlist.id}`)}
                    />
                ))}
            </TileGrid>
            <NamePlaylistDialog
                open={naming}
                title="New playlist"
                submitLabel="Create"
                onSubmit={create}
                onClose={() => setNaming(false)}
            />
        </>
    );
};
