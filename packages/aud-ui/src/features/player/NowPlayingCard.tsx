import SkipNextIcon from "@mui/icons-material/SkipNext";
import SkipPreviousIcon from "@mui/icons-material/SkipPrevious";
import { Box, Card, CardContent, IconButton, LinearProgress, Stack, Typography } from "@mui/material";
import React from "react";
import { useAppSelector } from "../../hooks";
import { NowPlayingPanel } from "../shared/NowPlayingPanel";
import { AlbumCover } from "../library/AlbumCover";
import { formatDuration } from "../library/libraryFormat";
import { nowPlayingText } from "./nowPlayingText";
import { PlayPauseButton } from "./PlayPauseButton";
import { selectCurrentTrack, selectPlayerState } from "./playerSelectors";
import { usePlayerCommand } from "./usePlayerCommand";
import { usePlayerPosition } from "./usePlayerPosition";

const COVER_SIZE = 64;

/**
 * What is playing, with Previous, Play or Pause and Next, for the narrow System Center panel. Nothing when the queue is empty.
 * The position is only shown: a slider in a panel that is scrolled with a finger would be moved by accident.
 */
export const NowPlayingCard: React.FC = () => {
    const state = useAppSelector(selectPlayerState);
    const track = useAppSelector(selectCurrentTrack);
    const position = usePlayerPosition();
    const send = usePlayerCommand();
    if (!state || !track || state.currentIndex === undefined) return null;

    const { title, subtitle, isBook } = nowPlayingText(state.queue, state.currentIndex);
    const duration = track.durationSec ?? 0;
    const shown = Math.min(position, duration || Infinity);

    return (
        <Card>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    {isBook ? "Audiobook" : "Music"}
                </Typography>
                <NowPlayingPanel
                    leading={
                        <Box sx={{ width: COVER_SIZE, flexShrink: 0 }}>
                            <AlbumCover collection={track.collection} albumId={track.albumId} hasCover={track.hasCover} />
                        </Box>
                    }
                    title={title}
                    subtitle={subtitle}
                />
                <Stack direction="row" alignItems="center" justifyContent="center" spacing={1} sx={{ mt: 1 }}>
                    <IconButton onClick={() => send("player_previous", {})} aria-label="Previous">
                        <SkipPreviousIcon />
                    </IconButton>
                    <PlayPauseButton />
                    <IconButton onClick={() => send("player_next", {})} aria-label="Next">
                        <SkipNextIcon />
                    </IconButton>
                </Stack>
                {duration > 0 && (
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Typography variant="caption" color="text.secondary" sx={{ width: 40, textAlign: "right" }}>
                            {formatDuration(Math.floor(shown))}
                        </Typography>
                        <LinearProgress variant="determinate" value={(100 * shown) / duration} sx={{ flex: 1 }} />
                        <Typography variant="caption" color="text.secondary" sx={{ width: 40 }}>
                            {formatDuration(duration)}
                        </Typography>
                    </Stack>
                )}
            </CardContent>
        </Card>
    );
};
