import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import {
    Box,
    Button,
    Card,
    CardContent,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import { usePortalContainerRef } from "@uxp/ui-lib";
import { errorText } from "../../api/errorText";
import { Playlist, PLAYLIST_NAME_MAX_LENGTH } from "@vid/common";
import React, { useState } from "react";
import { thumbnailUrl } from "../../api/home-video-api";
import { PlayAllButton } from "../cast/PlayAllButton";
import { formatDuration } from "../home-video/clipFormat";
import { useGetClipsQuery } from "../home-video/home-video.api";
import { Mosaic } from "../shared/Mosaic";
import { LabelledIconButton } from "../shared/LabelledIconButton";
import { PAGE_WIDTH } from "../shared/pageWidth";
import { useDeletePlaylistMutation, useGetPlaylistsQuery, useRenamePlaylistMutation } from "./playlist.api";
import { byName, WARNING_SX, samePlaylistName } from "./playlistText";

const MOSAIC_CLIPS = 4;

const RenameDialog: React.FC<{ playlist: Playlist; onClose: () => void }> = ({ playlist, onClose }) => {
    const portalContainer = usePortalContainerRef();
    const { data: playlists = [] } = useGetPlaylistsQuery();
    const [rename, { isLoading }] = useRenamePlaylistMutation();
    const [name, setName] = useState(playlist.name);
    const [error, setError] = useState<string>();
    const trimmed = name.trim();
    const taken = playlists.some((p) => p.id !== playlist.id && samePlaylistName(p.name, trimmed));

    const submit = async () => {
        const result = await rename({ id: playlist.id, name: trimmed });
        if ("error" in result)
            return setError(errorText(result.error));
        onClose();
    };

    return (
        <Dialog open container={portalContainer.current} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>Rename the playlist</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    fullWidth
                    margin="dense"
                    label="Name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    onKeyDown={(event) => event.key === "Enter" && trimmed !== "" && !taken && void submit()}
                    error={taken || error !== undefined}
                    helperText={error ?? (taken ? "Another playlist has this name." : " ")}
                    slotProps={{ htmlInput: { maxLength: PLAYLIST_NAME_MAX_LENGTH } }}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button disabled={trimmed === "" || taken || trimmed === playlist.name || isLoading} onClick={submit}>
                    Rename
                </Button>
            </DialogActions>
        </Dialog>
    );
};

const DeleteDialog: React.FC<{ playlist: Playlist; onClose: () => void }> = ({ playlist, onClose }) => {
    const portalContainer = usePortalContainerRef();
    const [remove, { isLoading }] = useDeletePlaylistMutation();
    const [error, setError] = useState<string>();

    const submit = async () => {
        const result = await remove(playlist.id);
        if ("error" in result)
            return setError(errorText(result.error));
        onClose();
    };

    return (
        <Dialog open container={portalContainer.current} onClose={onClose}>
            <DialogTitle>Delete {playlist.name}?</DialogTitle>
            <DialogContent>
                <DialogContentText color={error ? "error" : undefined}>
                    {error ?? "The clips stay in the library, only the list goes."}
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button variant="contained" color="warning" sx={WARNING_SX} disabled={isLoading} onClick={submit}>
                    Delete
                </Button>
            </DialogActions>
        </Dialog>
    );
};

const PlaylistCard: React.FC<{ playlist: Playlist }> = ({ playlist }) => {
    const { data: clips } = useGetClipsQuery();
    const [renaming, setRenaming] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // A clip that is no longer in the library is left out when playing, and counted here.
    const playable = clips ? playlist.clipIds.filter((id) => clips.some((c) => c.id === id)) : playlist.clipIds;
    const missing = playlist.clipIds.length - playable.length;
    const totalSeconds = clips ? playable.reduce((sum, id) => sum + (clips.find((c) => c.id === id)?.durationSeconds ?? 0), 0) : 0;
    const info = [
        `${playlist.clipIds.length} ${playlist.clipIds.length === 1 ? "clip" : "clips"}`,
        clips && totalSeconds > 0 ? formatDuration(totalSeconds) : undefined,
        missing > 0 ? `${missing} missing` : undefined,
    ]
        .filter(Boolean)
        .join(" · ");

    return (
        <Card variant="outlined">
            <CardContent sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                <Mosaic urls={playable.slice(0, MOSAIC_CLIPS).map(thumbnailUrl)} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" noWrap sx={{ fontWeight: 600 }}>
                        {playlist.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                        {info}
                    </Typography>
                    <Stack direction="row" alignItems="center" sx={{ mt: 0.5, ml: -1 }}>
                        <PlayAllButton clipIds={playable} label="Play" />
                        <LabelledIconButton label="Rename" onClick={() => setRenaming(true)}>
                            <EditIcon />
                        </LabelledIconButton>
                        <LabelledIconButton label="Delete" onClick={() => setDeleting(true)}>
                            <DeleteIcon />
                        </LabelledIconButton>
                    </Stack>
                </Box>
            </CardContent>
            {renaming && <RenameDialog playlist={playlist} onClose={() => setRenaming(false)} />}
            {deleting && <DeleteDialog playlist={playlist} onClose={() => setDeleting(false)} />}
        </Card>
    );
};

/** The saved playlists. One is made from a queue on the player page; here it can be played, renamed and deleted. */
export const PlaylistsPage: React.FC = () => {
    const { data: playlists } = useGetPlaylistsQuery();

    return (
        <Box sx={{ p: { xs: 0, sm: 2 }, maxWidth: PAGE_WIDTH, mx: "auto" }}>
            {playlists?.length === 0 && (
                <Typography color="text.secondary">
                    No playlists yet. Play some clips on a Chromecast and use Save as playlist on its player page.
                </Typography>
            )}
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(auto-fill, minmax(420px, 1fr))" }, gap: 1.5 }}>
                {[...(playlists ?? [])].sort(byName).map((playlist) => (
                    <PlaylistCard key={playlist.id} playlist={playlist} />
                ))}
            </Box>
        </Box>
    );
};
