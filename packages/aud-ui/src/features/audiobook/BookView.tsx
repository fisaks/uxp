import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import ReplayIcon from "@mui/icons-material/Replay";
import { Alert, Button, CircularProgress, List, ListItem, ListItemButton, ListItemText, Stack, Typography } from "@mui/material";
import React from "react";
import { useParams } from "react-router-dom";
import { useAppSelector } from "../../hooks";
import { AlbumPage } from "../library/AlbumPage";
import { formatDuration } from "../library/libraryFormat";
import { selectCurrentTrackId } from "../player/playerSelectors";
import { usePlayerActions } from "../player/usePlayerActions";
import { useRequest } from "../shared/useRequest";
import { partNames } from "./partNames";

export const BookView: React.FC = () => {
    const { bookId = "" } = useParams();
    const { data, error } = useRequest("audiobook_get_parts", { albumId: bookId });
    const { playBook } = usePlayerActions();
    const playingId = useAppSelector(selectCurrentTrackId);

    if (error) return <Alert severity="error">{error}</Alert>;
    if (!data) return <CircularProgress size={24} />;

    const { artist, album, tracks, progress } = data;
    const totalSeconds = tracks.reduce((sum, part) => sum + (part.durationSec ?? 0), 0);
    const names = partNames(tracks);
    const resumePart = progress && names[tracks.findIndex((part) => part.id === progress.partId)];

    return (
        <>
            <AlbumPage
                collection="audiobooks"
                artistId={artist.id}
                album={album}
                info={
                    <>
                        <Typography variant="h5" sx={{ overflowWrap: "anywhere" }}>
                            {album.title}
                        </Typography>
                        <Typography color="text.secondary">
                            {[
                                artist.name,
                                tracks.length === 1 ? undefined : `${tracks.length} parts`,
                                totalSeconds > 0 && formatDuration(totalSeconds),
                            ]
                                .filter(Boolean)
                                .join(" · ")}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                            <Button variant="contained" startIcon={<PlayArrowIcon />} onClick={() => playBook(album.id)}>
                                {progress ? "Continue" : "Play"}
                            </Button>
                            {progress && (
                                <Button variant="outlined" startIcon={<ReplayIcon />} onClick={() => playBook(album.id, tracks[0].id)}>
                                    Start over
                                </Button>
                            )}
                        </Stack>
                        {progress && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                                {[tracks.length === 1 ? undefined : resumePart, formatDuration(progress.positionSec)]
                                    .filter(Boolean)
                                    .join(" · ")}
                            </Typography>
                        )}
                    </>
                }
            >
                <List disablePadding>
                    {tracks.map((part, index) => (
                        <ListItem key={part.id} disablePadding divider>
                            <ListItemButton selected={part.id === playingId} onClick={() => playBook(album.id, part.id)}>
                                <ListItemText
                                    primary={names[index]}
                                    secondary={part.durationSec ? formatDuration(part.durationSec) : undefined}
                                    slotProps={{ primary: { sx: { fontWeight: part.id === playingId ? 600 : undefined } } }}
                                />
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
            </AlbumPage>
        </>
    );
};
