import Forward30Icon from "@mui/icons-material/Forward30";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import Replay30Icon from "@mui/icons-material/Replay30";
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    IconButton,
    List,
    ListItemButton,
    ListItemText,
    Slider,
    Stack,
    Typography,
} from "@mui/material";
import React from "react";
import { useParams } from "react-router-dom";
import { READABLE_WIDTH } from "../shared/ReadableWidth";
import { partNames } from "../audiobook/partNames";
import { coverUrl, formatDuration } from "../library/libraryFormat";
import { useBookListener } from "./useBookListener";
import { useMediaSession } from "./useMediaSession";

/** A tab of its own that plays one audiobook in this browser, apart from the player of the house. */
export const ListenPage: React.FC = () => {
    const { albumId = "" } = useParams();
    const { data, link, src, error, audioRef, playing, positionSec, partIndex, speed, controls, skipSec, audioProps } =
        useBookListener(albumId);
    const names = data ? partNames(data.tracks) : [];

    useMediaSession({
        audioRef,
        album: data?.album,
        artistName: data?.artist.name,
        partName: names.length > 1 ? names[partIndex] : undefined,
        link,
        partIndex,
        positionSec,
        speed,
        skipSec,
        onGoToPart: controls.goToPart,
    });

    if (error && !(data && link)) return <Alert severity="error">{error}</Alert>;
    if (!data || !link || !src) return <CircularProgress size={24} />;

    const { album, artist, tracks } = data;
    const partStart = link.parts[partIndex].startSec;
    const partEnd = link.parts[partIndex + 1]?.startSec ?? link.totalSec;

    return (
        <Box sx={{ p: { xs: 0, sm: 2 }, maxWidth: READABLE_WIDTH, mx: "auto" }}>
            <audio ref={audioRef} src={src} preload="metadata" {...audioProps} />
            <Stack alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <Box component="img" src={coverUrl("audiobooks", album.id)} alt="" sx={{ width: "70%", maxWidth: 280, borderRadius: 1 }} />
                <Typography variant="h6" align="center" sx={{ overflowWrap: "anywhere" }}>
                    {album.title}
                </Typography>
                <Typography color="text.secondary" align="center">
                    {[artist.name, tracks.length > 1 && names[partIndex]].filter(Boolean).join(" · ")}
                </Typography>
            </Stack>
            {error && (
                <Alert severity="warning" action={<Button onClick={controls.retry}>Retry</Button>} sx={{ mb: 1 }}>
                    {error}
                </Alert>
            )}
            <Slider
                value={Math.min(positionSec, link.totalSec)}
                max={link.totalSec}
                onChange={(_, value) => controls.seekTo(value as number)}
                aria-label="Place in the book"
            />
            <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">
                    {formatDuration(Math.floor(positionSec))}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    {formatDuration(Math.floor(link.totalSec))}
                </Typography>
            </Stack>
            <Stack direction="row" justifyContent="center" alignItems="center" spacing={2} sx={{ my: 1 }}>
                <IconButton size="large" onClick={() => controls.skip(-skipSec)} aria-label={`Back ${skipSec} seconds`}>
                    <Replay30Icon fontSize="large" />
                </IconButton>
                <IconButton size="large" color="primary" onClick={controls.toggle} aria-label={playing ? "Pause" : "Play"}>
                    {playing ? <PauseIcon sx={{ fontSize: 56 }} /> : <PlayArrowIcon sx={{ fontSize: 56 }} />}
                </IconButton>
                <IconButton size="large" onClick={() => controls.skip(skipSec)} aria-label={`Forward ${skipSec} seconds`}>
                    <Forward30Icon fontSize="large" />
                </IconButton>
                <Button onClick={controls.changeSpeed} aria-label={`Speed ${speed} times, press to change`}>
                    {speed}×
                </Button>
            </Stack>
            {tracks.length > 1 && (
                <>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "center" }}>
                        {formatDuration(Math.floor(positionSec - partStart))} / {formatDuration(Math.floor(partEnd - partStart))}
                    </Typography>
                    <List disablePadding sx={{ mt: 1 }}>
                        {tracks.map((part, index) => (
                            <ListItemButton key={part.id} divider selected={index === partIndex} onClick={() => controls.goToPart(index)}>
                                <ListItemText
                                    primary={names[index]}
                                    secondary={part.durationSec ? formatDuration(part.durationSec) : undefined}
                                    slotProps={{ primary: { sx: { fontWeight: index === partIndex ? 600 : undefined } } }}
                                />
                            </ListItemButton>
                        ))}
                    </List>
                </>
            )}
        </Box>
    );
};
